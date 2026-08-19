FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for prisma
RUN apt-get update -y && apt-get install -y openssl

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

FROM node:20-slim AS runner

WORKDIR /app

# Install chromium & dependencies for puppeteer and openssl for prisma
RUN apt-get update -y && apt-get install -y \
    openssl \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=builder /app ./

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
