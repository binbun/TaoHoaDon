FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma

RUN npm install

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=@taohoadon/shared
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=@taohoadon/api

FROM node:20-alpine AS runner

WORKDIR /app

# Install chromium for puppeteer
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app ./

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
