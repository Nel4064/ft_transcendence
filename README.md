*This project has been created as part of the 42 curriculum by mgrossi, neandrie, weiyang*

# 🎬 CinéClub

A web platform for a local cinema club. Organizers curate an official screening schedule from live [datacinesindes.fr](https://datacinesindes.fr) data. Members browse, RSVP, chat in real time, and export their selection as an iCalendar (.ics) file that can be imported into any standard calendar app (Google Calendar, Apple Calendar, Outlook...).

> 🚧 Work in progress.

This project aim to use a fully typed TypeScript stack, from the frontend to the database. The application is containerized for easy deployment and reproducible environments.

Frontend:
TypeScript
React
Tailwind CSS

Backend:
TypeScript
NestJS

Database:
PostgreSQL

ORM:
Prisma 7

Real-time:
Socket.io

Deployment:
Podman

## Prerequisites

- [Podman](https://podman.io/) and `podman-compose`
- `make`


## 2. Start the stack

```bash
# build images
make build

# create containers and volumes
make up
# might take several minutes
```
To follow the logs:

```bash
podman compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev logs -f

# inspect containers
make containers
# development_proxy
# development_frontend
# development_backend
# development_db

# inspect volumes
make volumes
# development_frontend_node_modules
# development_backend_node_modules
# development_postgres_data
```

## 3. Open the app

| Service       | URL                                              |
|---------------|--------------------------------------------------|
| Website       | http://localhost:1024                            |
| API           | http://localhost:3000                            |
| Prisma Studio | http://localhost:5555 (when started, see below)  |

⚠️ Type `http://` explicitly: Firefox may silently upgrade to `https://`, which fails in dev.

## Inspect the database (Prisma Studio)

In dev, Postgres is published on `localhost:5433` (this machine only), so tools on your host can reach it.
From the repo root, with the stack running:

```bash
npx prisma@7.10.0 studio --url "postgresql://$(grep ^POSTGRES_BACKEND_USER= .env.dev | cut -d= -f2):$(cat secrets/postgres_backend_user_pw.txt)@localhost:5433/transcendence"
```

Then open http://localhost:5555. Stop it with `Ctrl+C`.

- Run it from the repo root, not `backend/`: it skips `prisma7.config.ts`, which needs the backend's packages installed on the host.
- The version `7.10.0` must match `prisma` in `backend/package.json`.

Quick look without Studio:

```bash
podman exec -it development-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -x -c "SELECT * FROM screenings;"'
```

## Troubleshooting

```bash
podman ps                          # which containers are running?
podman logs development-proxy      # or -frontend, -backend, -db

# if any container is missing or error occurs, try this:
podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev up -d [_name_]
# podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev up -d proxy
# podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev up -d frontend
# podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev up -d backend
# podman-compose -p development -f compose.yaml -f compose.dev.yaml --env-file .env.dev up -d db
```

"No such container" errors on `make down` are harmless: nothing was running.

## 4. Stop the stack

```bash
make down
```

👉 Run `make down` when you're done working, **before switching branches**, and before pulling changes to Dockerfiles, compose files or dependencies. Then `make up` again to rebuild.

## 5. clean all
```bash
# delete containers and volumes
make clean
```

