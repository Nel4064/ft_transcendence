COMPOSE = podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev

# all secrets live in the podman secret store (external: true in compose.yaml)
# generated: random values created here / manual: filled in by hand from the 42 intra
GENERATED_SECRETS = jwt_secret postgres_backend_user_pw postgres_superuser_pw
MANUAL_SECRETS = fortytwo_client_id fortytwo_client_secret

# 32 random bytes as hex: only 0-9a-f, so safe inside DATABASE_URL (no trailing newline)
RANDOM_SECRET = openssl rand -hex 32 | tr -d '\n'

# exact prisma version installed in the backend container (from its lock file)
PRISMA_VERSION = $(shell node -p "require('./backend/package-lock.json').packages['node_modules/prisma'].version")

all : build up

build: env
	$(COMPOSE) build

up: env secrets
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

# also removes the volumes: database data and node_modules are lost
clean:
	$(COMPOSE) down -v

re: clean all

# rebuild images and refresh node_modules volumes (the database is kept)
rebuild: env secrets
	$(COMPOSE) down
	-podman volume rm development_frontend_node_modules development_backend_node_modules
	$(COMPOSE) build
	$(COMPOSE) up -d

# database name and user, read from .env.dev (the superuser is only used inside the db container)
DB_NAME = $$(grep ^POSTGRES_DB= .env.dev | cut -d= -f2)
DB_SUPERUSER = $$(grep ^POSTGRES_SUPERUSER= .env.dev | cut -d= -f2)
DB_BACKEND_USER = $$(grep ^POSTGRES_BACKEND_USER= .env.dev | cut -d= -f2)

# manual backup right now, in ./backups (manual_*.dump files are never deleted by the retention)
backup: env
	@umask 077; file=backups/manual_$$(date -u +%Y%m%d_%H%M%S).dump; \
	if podman exec development-db pg_dump -U $(DB_SUPERUSER) -d $(DB_NAME) -Fc > $$file.tmp \
		&& podman exec -i development-db pg_restore --list < $$file.tmp | grep -q "TABLE DATA"; then \
		mv $$file.tmp $$file; echo "💾 Backup saved: $$file"; \
	else \
		rm -f $$file.tmp; echo "❌ Backup failed (is the stack running? make up)"; exit 1; \
	fi

# restore a dump: make restore FILE=backups/<name>.dump (replaces the current data)
restore:
	@test -f "$(FILE)" || { echo "usage: make restore FILE=backups/<name>.dump"; exit 1; }
	@[ "$$(podman inspect -f '{{.State.Running}}' development-db 2>/dev/null)" = "true" ] \
		&& podman container exists development-backend \
		|| { echo "❌ The containers are not running: run make up first"; exit 1; }
	podman stop development-backend
	@podman exec -i development-db pg_restore -U $(DB_SUPERUSER) -d $(DB_NAME) \
		--clean --if-exists --single-transaction --no-owner --no-privileges --role=$(DB_BACKEND_USER) < "$(FILE)"; status=$$?; \
	podman start development-backend; \
	echo "⏳ Waiting for the backend to be healthy..."; \
	healthy=0; i=0; while [ $$i -lt 60 ]; do \
		if podman healthcheck run development-backend >/dev/null 2>&1; then healthy=1; break; fi; \
		i=$$((i+1)); sleep 2; \
	done; \
	podman exec development-proxy nginx -s reload >/dev/null 2>&1 || podman restart development-proxy; \
	if [ $$status -ne 0 ]; then echo "❌ Restore failed, data unchanged"; \
	elif [ $$healthy -eq 0 ]; then echo "⚠️  Restored $(FILE), but the backend is not healthy after 2 min: podman logs development-backend"; status=1; \
	else echo "✅ Restored $(FILE)"; fi; \
	exit $$status

# restart the app containers, then reload nginx so it looks up their new IP addresses
restart:
	podman restart development-backend development-frontend
	podman exec development-proxy nginx -s reload || podman restart development-proxy

logs:
	$(COMPOSE) logs -f

# Prisma Studio on http://localhost:5555 (Ctrl+C to stop), reading the dev db published on localhost:5433
studio:
	@npx prisma@$(PRISMA_VERSION) studio --port 5555 --url "postgresql://$$(grep ^POSTGRES_BACKEND_USER= .env.dev | cut -d= -f2):$$(cat secrets/postgres_backend_user_pw.txt)@localhost:5433/$$(grep ^POSTGRES_DB= .env.dev | cut -d= -f2)"

env:
	@test -f .env.dev || cp .env.dev.example .env.dev
	@mkdir -p backups && chmod 700 backups

secrets:
	@mkdir -p secrets
	@for s in $(GENERATED_SECRETS); do \
		test -s secrets/$$s.txt || $(RANDOM_SECRET) > secrets/$$s.txt; \
	done
	@for s in $(MANUAL_SECRETS); do \
		touch secrets/$$s.txt; \
		test -s secrets/$$s.txt || echo "⚠️  secrets/$$s.txt is empty (needed for 42 OAuth)"; \
	done
	@chmod 600 secrets/*.txt
	@for s in $(GENERATED_SECRETS) $(MANUAL_SECRETS); do \
		if ! podman secret exists $$s && test -s secrets/$$s.txt; then \
			podman secret create $$s secrets/$$s.txt; \
		fi; \
	done
	@echo "🔑 Secrets are ready."

volumes:
	podman volume ls

containers:
	podman ps -a

.PHONY: up build down clean re rebuild restart logs env secrets volumes containers studio backup restore