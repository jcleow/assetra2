#!/usr/bin/env bash
set -euo pipefail

POSTGRES_PORT="${POSTGRES_PORT:-5544}"
POSTGRES_DB="${POSTGRES_DB:-assetra}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
CONTAINER_NAME="${CONTAINER_NAME:-assetra-postgres}"

info() {
  printf "[32m▸[0m %s\n" "$*"
}

error() {
  printf "[31m▸ %s[0m\n" "$*" >&2
}

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Missing dependency: $1"
    exit 1
  fi
}

require docker
require pnpm

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  info "Restarting existing Postgres container ${CONTAINER_NAME}"
  docker start "${CONTAINER_NAME}" >/dev/null
else
  info "Launching Postgres container ${CONTAINER_NAME} on port ${POSTGRES_PORT}"
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${POSTGRES_PORT}:5432" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    postgres:16-alpine >/dev/null
fi

info "Waiting for Postgres to accept connections…"
until docker exec "${CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done

export POSTGRES_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
info "POSTGRES_URL=${POSTGRES_URL}"

info "Installing dependencies (pnpm install)…"
pnpm install

info "Running database migrations…"
pnpm db:migrate

info "Starting Next.js + Go via pnpm dev:full"
exec pnpm dev:full
