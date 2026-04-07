import json
import os
from datetime import datetime, timezone

import psycopg2
import requests
from psycopg2.extras import RealDictCursor
from redis import Redis
from rq import Connection, Worker


DB_CONFIG = {
	"host": os.getenv("DB_HOST", "db"),
	"port": os.getenv("DB_PORT", "5432"),
	"dbname": os.getenv("DB_NAME", "postgres"),
	"user": os.getenv("DB_USER", "postgres"),
	"password": os.getenv("DB_PASSWORD", "postgres"),
}

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
MESSAGE_QUEUE_NAME = os.getenv("MESSAGE_QUEUE_NAME", "outbound_messages")

META_BASE_URL = os.getenv("META_BASE_URL", "https://graph.facebook.com/v20.0")
META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")


def get_db_connection():
	return psycopg2.connect(**DB_CONFIG)


def insert_event(cur, message_id, provider, event_type, payload):
	cur.execute(
		"""
		INSERT INTO message_events (message_id, provider, event_type, payload)
		VALUES (%s, %s, %s, %s::jsonb)
		""",
		(message_id, provider, event_type, json.dumps(payload)),
	)


def update_message_status(cur, message_id, status, provider_message_id=None, failure_reason=None):
	cur.execute(
		"""
		UPDATE outbound_messages
		SET status = %s,
			provider_message_id = COALESCE(%s, provider_message_id),
			failure_reason = COALESCE(%s, failure_reason),
			updated_at = NOW()
		WHERE id = %s
		""",
		(status, provider_message_id, failure_reason, message_id),
	)


def fetch_message(message_id):
	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				SELECT id, contact_phone, template_name, provider, payload, status
				FROM outbound_messages
				WHERE id = %s
				LIMIT 1
				""",
				(message_id,),
			)
			return cur.fetchone()


def fetch_template_text(template_name):
	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				SELECT body
				FROM message_templates
				WHERE name = %s AND active = true
				LIMIT 1
				""",
				(template_name,),
			)
			row = cur.fetchone()
			return row["body"] if row else None


def render_message_text(template_name, payload):
	template = fetch_template_text(template_name)
	if not template:
		return str(payload.get("text") or "Ola! Somos da equipe Yeb.")

	# Keep rendering simple and resilient when variables are missing.
	try:
		return template.format(**payload)
	except Exception:
		return template


def send_meta_whatsapp(phone, text):
	if not META_PHONE_NUMBER_ID or not META_ACCESS_TOKEN:
		raise RuntimeError("Meta provider is not configured")

	url = f"{META_BASE_URL}/{META_PHONE_NUMBER_ID}/messages"
	headers = {
		"Authorization": f"Bearer {META_ACCESS_TOKEN}",
		"Content-Type": "application/json",
	}
	request_payload = {
		"messaging_product": "whatsapp",
		"to": phone,
		"type": "text",
		"text": {"body": text},
	}

	response = requests.post(url, headers=headers, json=request_payload, timeout=20)
	response.raise_for_status()
	data = response.json()
	messages = data.get("messages") or []
	provider_message_id = messages[0].get("id") if messages else None
	return provider_message_id, data


def process_outbound_message(message_id):
	row = fetch_message(message_id)
	if not row:
		return {"status": "skipped", "reason": "message_not_found"}

	if row["status"] not in ("queued", "retry"):
		return {"status": "skipped", "reason": f"invalid_status:{row['status']}"}

	phone = row["contact_phone"]
	payload = row["payload"] or {}
	text = render_message_text(row["template_name"], payload)

	try:
		provider_message_id = None
		provider_payload = {}
		provider = (row.get("provider") or "meta").lower()
		if provider == "meta":
			provider_message_id, provider_payload = send_meta_whatsapp(phone, text)
		else:
			raise RuntimeError(f"Unsupported provider: {provider}")

		with get_db_connection() as conn:
			with conn.cursor() as cur:
				update_message_status(cur, message_id, "sent", provider_message_id=provider_message_id)
				insert_event(
					cur,
					message_id,
					provider,
					"sent",
					{
						"at": datetime.now(timezone.utc).isoformat(),
						"provider_response": provider_payload,
					},
				)
		return {"status": "sent", "providerMessageId": provider_message_id}
	except Exception as exc:
		with get_db_connection() as conn:
			with conn.cursor() as cur:
				update_message_status(cur, message_id, "failed", failure_reason=str(exc))
				insert_event(
					cur,
					message_id,
					row.get("provider") or "meta",
					"failed",
					{
						"at": datetime.now(timezone.utc).isoformat(),
						"error": str(exc),
					},
				)
		raise


if __name__ == "__main__":
	redis_conn = Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, password=REDIS_PASSWORD)
	with Connection(redis_conn):
		worker = Worker([MESSAGE_QUEUE_NAME])
		worker.work(with_scheduler=False)
