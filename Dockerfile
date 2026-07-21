# Single container: builds the web SPA and runs the API, which serves both /api
# and the static SPA on one port. SQLite is recreated + seeded on each start,
# so the image is fully self-contained (no volumes required).
FROM node:22-bookworm-slim

WORKDIR /app

# Install workspace deps first for better layer caching.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

COPY . .

RUN npm run build --workspace apps/web

ENV NODE_ENV=production
ENV PORT=3001
ENV FINEOS_WEB_DIST=/app/apps/web/dist

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace", "apps/api"]
