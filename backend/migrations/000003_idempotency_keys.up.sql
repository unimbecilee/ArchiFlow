CREATE TABLE IF NOT EXISTS idempotency_keys (
    key_hash      VARCHAR(64) PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    route         VARCHAR(128) NOT NULL,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_route ON idempotency_keys(user_id, route);