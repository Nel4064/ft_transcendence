FROM docker.io/library/postgres:18-alpine3.23
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
ENTRYPOINT [ "/usr/local/bin/backup.sh" ]