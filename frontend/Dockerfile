# Build stage
FROM node:20.18.1-alpine AS builder

WORKDIR /app

# Install deps on Node 20 (lock from Node 22 host can break npm ci here)
COPY package.json ./
RUN npm install

COPY . .
# Rewrites /api → backend (evaluated at build time for standalone output)
ARG INTERNAL_API_URL=http://backend:5000
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
# Inlined in le bundle client (WS direct si le proxy Next ne fait pas l'upgrade)
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_REALTIME_MODE=ws
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_REALTIME_MODE=${NEXT_PUBLIC_REALTIME_MODE}
RUN npm run build

# Production stage
FROM node:20.18.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R app:app /app

USER app

EXPOSE 3000

ENV PORT=3000
# Docker sets HOSTNAME to the container id; Next standalone binds that name and crashes (EAI_AGAIN).
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
