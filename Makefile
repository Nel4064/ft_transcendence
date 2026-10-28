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

# restart the app containers, and the proxy so nginx picks up their new IP addresses
restart:
	podman restart development-backend development-frontend development-proxy

logs:
	$(COMPOSE) logs -f

# Prisma Studio on http://localhost:5555 (Ctrl+C to stop), reading the dev db published on localhost:5433
studio:
	@npx prisma@$(PRISMA_VERSION) studio --port 5555 --url "postgresql://$$(grep ^POSTGRES_BACKEND_USER= .env.dev | cut -d= -f2):$$(cat secrets/postgres_backend_user_pw.txt)@localhost:5433/$$(grep ^POSTGRES_DB= .env.dev | cut -d= -f2)"

env:
	@test -f .env.dev || cp .env.dev.example .env.dev

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

.PHONY: up build down clean re rebuild restart logs env secrets volumes containers studio
