FROM caddy:2-alpine
WORKDIR /srv
COPY index.html styles.css app.js three-scenes.js visuals.js ./
CMD ["sh", "-c", "caddy file-server --root /srv --listen :${PORT:-8080}"]
