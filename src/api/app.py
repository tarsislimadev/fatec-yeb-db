import json
import os
import hashlib
from datetime import datetime, timezone

import psycopg2
import redis
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg2.extras import RealDictCursor
from rq import Queue


app = Flask(__name__)
CORS(app)


DB_CONFIG = {
	"host": os.getenv("DB_HOST", "db"),
	"port": os.getenv("DB_PORT", "5432"),
	"dbname": os.getenv("DB_NAME", "postgres"),
	"user": os.getenv("DB_USER", "postgres"),
	"password": os.getenv("DB_PASSWORD", "postgres"),
}

BRASIL_API_BASE = os.getenv("CNPJ_API_BASE", "https://brasilapi.com.br/api/cnpj/v1")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
CNPJ_CACHE_TTL_SECONDS = int(os.getenv("CNPJ_CACHE_TTL_SECONDS", "86400"))
CNPJ_CACHE_NOT_FOUND_TTL_SECONDS = int(os.getenv("CNPJ_CACHE_NOT_FOUND_TTL_SECONDS", "10800"))
MESSAGE_QUEUE_NAME = os.getenv("MESSAGE_QUEUE_NAME", "outbound_messages")

redis_client = None
queue_client = None


class CnpjNotFoundError(Exception):
	pass


def normalize_cnpj(cnpj):
	return "".join(char for char in cnpj if char.isdigit())


def is_valid_cnpj(cnpj):
	digits = normalize_cnpj(cnpj)
	return len(digits) == 14


def get_db_connection():
	return psycopg2.connect(**DB_CONFIG)


def get_redis_connection():
	global redis_client
	if redis_client is None:
		redis_client = redis.Redis(
			host=REDIS_HOST,
			port=REDIS_PORT,
			db=REDIS_DB,
			password=REDIS_PASSWORD,
			decode_responses=True,
		)
	return redis_client


def get_queue_redis_connection():
	global queue_client
	if queue_client is None:
		queue_client = redis.Redis(
			host=REDIS_HOST,
			port=REDIS_PORT,
			db=REDIS_DB,
			password=REDIS_PASSWORD,
		)
	return queue_client


def get_message_queue():
	return Queue(MESSAGE_QUEUE_NAME, connection=get_queue_redis_connection())


def get_cached_cnpj(cnpj):
	cache_key = f"cnpj:{cnpj}"
	try:
		cached = get_redis_connection().get(cache_key)
		if not cached:
			return None
		return json.loads(cached)
	except Exception:
		return None


def set_cached_cnpj(cnpj, payload, status, ttl):
	cache_key = f"cnpj:{cnpj}"
	cache_value = json.dumps({"status": status, "payload": payload})
	try:
		get_redis_connection().setex(cache_key, ttl, cache_value)
	except Exception:
		return


def normalize_phone(phone):
	digits = "".join(char for char in str(phone or "") if char.isdigit())
	return digits


def is_valid_phone(phone):
	return 10 <= len(phone) <= 13


def compute_idempotency_key(phone, template_name, campaign_id):
	raw_value = f"{phone}:{template_name}:{campaign_id or 'default'}"
	return hashlib.sha256(raw_value.encode("utf-8")).hexdigest()


def is_suppressed(phone):
	with get_db_connection() as conn:
		with conn.cursor() as cur:
			cur.execute(
				"""
				SELECT 1
				FROM suppression_list
				WHERE phone = %s AND active = true
				LIMIT 1
				""",
				(phone,),
			)
			return cur.fetchone() is not None


def log_lookup(cnpj, source, status, details="", company_id=None):
	with get_db_connection() as conn:
		with conn.cursor() as cur:
			cur.execute(
				"""
				INSERT INTO lookup_audit (company_id, cnpj, source, status, details)
				VALUES (%s, %s, %s, %s, %s)
				""",
				(company_id, cnpj, source, status, details),
			)


def fetch_cnpj_data(cnpj):
	cached = get_cached_cnpj(cnpj)
	if cached:
		if cached.get("status") == "found":
			return cached.get("payload") or {}
		if cached.get("status") == "not_found":
			raise CnpjNotFoundError("CNPJ not found in provider")

	url = f"{BRASIL_API_BASE}/{cnpj}"
	response = requests.get(url, timeout=12)
	if response.status_code == 404:
		set_cached_cnpj(cnpj, payload={}, status="not_found", ttl=CNPJ_CACHE_NOT_FOUND_TTL_SECONDS)
		raise CnpjNotFoundError("CNPJ not found in provider")
	response.raise_for_status()
	payload = response.json()
	set_cached_cnpj(cnpj, payload=payload, status="found", ttl=CNPJ_CACHE_TTL_SECONDS)
	return payload


def save_company(cnpj, payload, source):
	legal_name = payload.get("razao_social") or payload.get("nome")
	trade_name = payload.get("nome_fantasia")
	main_cnae = payload.get("cnae_fiscal_descricao")
	phone = payload.get("ddd_telefone_1")
	email = payload.get("email")

	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				INSERT INTO companies (
					cnpj,
					legal_name,
					trade_name,
					main_cnae,
					phone,
					email,
					status,
					source,
					verified,
					raw_data,
					updated_at
				)
				VALUES (%s, %s, %s, %s, %s, %s, 'found', %s, true, %s::jsonb, NOW())
				ON CONFLICT (cnpj)
				DO UPDATE SET
					legal_name = EXCLUDED.legal_name,
					trade_name = EXCLUDED.trade_name,
					main_cnae = EXCLUDED.main_cnae,
					phone = EXCLUDED.phone,
					email = EXCLUDED.email,
					status = 'verified',
					source = EXCLUDED.source,
					verified = true,
					raw_data = EXCLUDED.raw_data,
					updated_at = NOW()
				RETURNING id, cnpj, legal_name, trade_name, main_cnae, phone, email, status, source, verified, updated_at
				""",
				(
					cnpj,
					legal_name,
					trade_name,
					main_cnae,
					phone,
					email,
					source,
					json.dumps(payload),
				),
			)
			company = cur.fetchone()

			qsa = payload.get("qsa") or []
			if qsa:
				cur.execute("DELETE FROM contacts WHERE company_id = %s AND source = %s", (company["id"], source))
				for partner in qsa:
					cur.execute(
						"""
						INSERT INTO contacts (company_id, name, role, source)
						VALUES (%s, %s, %s, %s)
						""",
						(
							company["id"],
							partner.get("nome_socio") or partner.get("nome"),
							partner.get("qualificacao_socio") or partner.get("qual"),
							source,
						),
					)

			return company


@app.get("/health")
def health():
	try:
		redis_status = "ok"
		with get_db_connection() as conn:
			with conn.cursor() as cur:
				cur.execute("SELECT 1")
				cur.fetchone()
		try:
			get_redis_connection().ping()
		except Exception:
			redis_status = "degraded"

		return jsonify(
			{
				"status": "ok",
				"redis": redis_status,
				"timestamp": datetime.now(timezone.utc).isoformat(),
			}
		)
	except Exception as exc:
		return jsonify({"status": "error", "detail": str(exc)}), 500


@app.get("/api/companies")
def list_companies():
	limit = request.args.get("limit", default=20, type=int)
	limit = 1 if limit < 1 else min(limit, 100)

	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				SELECT id, cnpj, legal_name, trade_name, main_cnae, phone, email, status, source, verified, created_at, updated_at
				FROM companies
				ORDER BY updated_at DESC NULLS LAST, created_at DESC
				LIMIT %s
				""",
				(limit,),
			)
			records = cur.fetchall()
	return jsonify(records)


@app.post("/api/cnpj/lookup")
def cnpj_lookup():
	data = request.get_json(silent=True) or {}
	raw_cnpj = data.get("cnpj", "")

	if not raw_cnpj:
		return jsonify({"error": "cnpj is required"}), 400

	cnpj = normalize_cnpj(raw_cnpj)
	if not is_valid_cnpj(cnpj):
		return jsonify({"error": "invalid cnpj format, expected 14 digits"}), 400

	try:
		payload = fetch_cnpj_data(cnpj)
		company = save_company(cnpj, payload, source="brasilapi")
		log_lookup(cnpj, source="brasilapi", status="found", details="Lookup completed", company_id=company["id"])
		return jsonify(
			{
				"status": "found",
				"company": company,
				"contactsCount": len(payload.get("qsa") or []),
			}
		)
	except CnpjNotFoundError as exc:
		log_lookup(cnpj, source="brasilapi", status="pending", details=str(exc))
		return jsonify({"status": "pending", "error": "CNPJ not found in provider"}), 404
	except requests.HTTPError as exc:
		detail = f"HTTP error from CNPJ provider: {exc.response.status_code if exc.response else 'unknown'}"
		log_lookup(cnpj, source="brasilapi", status="blocked", details=detail)
		return jsonify({"status": "blocked", "error": detail}), 502
	except requests.RequestException as exc:
		detail = f"Failed to reach CNPJ provider: {str(exc)}"
		log_lookup(cnpj, source="brasilapi", status="pending", details=detail)
		return jsonify({"status": "pending", "error": detail}), 503
	except Exception as exc:
		log_lookup(cnpj, source="internal", status="blocked", details=str(exc))
		return jsonify({"status": "blocked", "error": "Unexpected server error"}), 500


@app.post("/api/messages/queue")
def queue_message():
	data = request.get_json(silent=True) or {}
	raw_phone = data.get("contact_phone")
	template_name = data.get("template_name")
	provider = data.get("provider", "meta")
	campaign_id = data.get("campaign_id")
	channel = data.get("channel", "whatsapp")
	company_id = data.get("company_id")
	contact_id = data.get("contact_id")
	payload = data.get("payload") or {}

	if not raw_phone or not template_name:
		return jsonify({"error": "contact_phone and template_name are required"}), 400

	phone = normalize_phone(raw_phone)
	if not is_valid_phone(phone):
		return jsonify({"error": "invalid contact_phone format"}), 400

	if is_suppressed(phone):
		return jsonify({"status": "blocked", "error": "phone is in suppression list"}), 409

	idempotency_key = compute_idempotency_key(phone, template_name, campaign_id)

	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				INSERT INTO outbound_messages (
					company_id,
					contact_id,
					contact_phone,
					template_name,
					provider,
					channel,
					campaign_id,
					idempotency_key,
					status,
					payload,
					updated_at
				)
				VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'queued', %s::jsonb, NOW())
				ON CONFLICT (idempotency_key)
				DO UPDATE SET updated_at = NOW()
				RETURNING id, company_id, contact_id, contact_phone, template_name, provider, channel, campaign_id, status, created_at, updated_at, (xmax = 0) AS inserted
				""",
				(
					company_id,
					contact_id,
					phone,
					template_name,
					provider,
					channel,
					campaign_id,
					idempotency_key,
					json.dumps(payload),
				),
			)
			result = cur.fetchone()

	message_status = "queued" if result.get("inserted") else "duplicate"
	job_id = None
	if result.get("inserted"):
		job = get_message_queue().enqueue("worker.process_outbound_message", result["id"], job_timeout=120)
		job_id = job.id

	result.pop("inserted", None)
	return jsonify({"status": message_status, "message": result, "jobId": job_id})


@app.post("/api/messages/webhook")
def message_webhook():
	data = request.get_json(silent=True) or {}
	provider = data.get("provider", "meta")
	event_type = data.get("event_type")
	provider_message_id = data.get("provider_message_id")
	message_id = data.get("message_id")
	failure_reason = data.get("failure_reason")
	payload = data.get("payload") or {}
	contact_phone = normalize_phone(data.get("contact_phone")) if data.get("contact_phone") else None

	if not event_type:
		return jsonify({"error": "event_type is required"}), 400

	status_map = {
		"queued": "queued",
		"sent": "sent",
		"delivered": "delivered",
		"read": "read",
		"failed": "failed",
		"reply": "replied",
		"opt_out": "blocked",
	}
	new_status = status_map.get(event_type, "sent")

	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			if not message_id and provider_message_id:
				cur.execute(
					"""
					SELECT id
					FROM outbound_messages
					WHERE provider_message_id = %s
					LIMIT 1
					""",
					(provider_message_id,),
				)
				found = cur.fetchone()
				message_id = found["id"] if found else None

			if not message_id:
				return jsonify({"error": "message_id or provider_message_id is required"}), 400

			cur.execute(
				"""
				UPDATE outbound_messages
				SET status = %s,
					failure_reason = COALESCE(%s, failure_reason),
					provider_message_id = COALESCE(%s, provider_message_id),
					updated_at = NOW()
				WHERE id = %s
				RETURNING id, status, provider_message_id, updated_at
				""",
				(new_status, failure_reason, provider_message_id, message_id),
			)
			message_row = cur.fetchone()

			if not message_row:
				return jsonify({"error": "message not found"}), 404

			cur.execute(
				"""
				INSERT INTO message_events (message_id, provider, event_type, provider_event_id, payload)
				VALUES (%s, %s, %s, %s, %s::jsonb)
				""",
				(message_id, provider, event_type, data.get("provider_event_id"), json.dumps(payload)),
			)

			if event_type == "opt_out" and contact_phone:
				cur.execute(
					"""
					INSERT INTO suppression_list (phone, reason, active, updated_at)
					VALUES (%s, %s, true, NOW())
					ON CONFLICT (phone)
					DO UPDATE SET reason = EXCLUDED.reason, active = true, updated_at = NOW()
					""",
					(contact_phone, "opt_out_webhook"),
				)

	return jsonify({"status": "ok", "message": message_row})


@app.get("/api/messages")
def list_messages():
	limit = request.args.get("limit", default=20, type=int)
	limit = 1 if limit < 1 else min(limit, 100)

	with get_db_connection() as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(
				"""
				SELECT id, company_id, contact_id, contact_phone, template_name, provider, channel, campaign_id, status, failure_reason, provider_message_id, created_at, updated_at
				FROM outbound_messages
				ORDER BY updated_at DESC, created_at DESC
				LIMIT %s
				""",
				(limit,),
			)
			records = cur.fetchall()

	return jsonify(records)


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=8080)
