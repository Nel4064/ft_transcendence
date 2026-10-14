# alpine3.24, not 3.23: nginx no longer rebuilds its 1.30 images on alpine3.23 (frozen since 2026-06)
FROM docker.io/library/nginx:1.30-alpine3.24 AS dev

COPY nginx.dev.conf /etc/nginx/nginx.conf

EXPOSE 80