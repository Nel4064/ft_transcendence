FROM docker.io/library/postgres:18-alpine3.23

COPY init.sh /docker-entrypoint-initdb.d/init.sh

RUN chmod 755 /docker-entrypoint-initdb.d/init.sh