-- Migration: Remove voice calling tables and columns
-- Safe to run multiple times; uses IF EXISTS

DROP TABLE IF EXISTS call_retry_log CASCADE;
DROP TABLE IF EXISTS call_outcomes CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS call_sessions CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS call_campaigns CASCADE;

ALTER TABLE phones DROP COLUMN IF EXISTS voice_suppressed_at;
ALTER TABLE phones DROP COLUMN IF EXISTS voice_suppression_reason;
