# Addis Tiggena API — production image (deployed to Telecloud ECS, see docs/03)
FROM node:22-alpine AS build
WORKDIR /app
# openssl BEFORE npm install/generate: Prisma detects the SSL flavor at engine-download
# time — without it the engines target openssl-1.1 (absent on modern Alpine) and the
# schema engine crash-loops the container at migrate time.
RUN apk add --no-cache openssl
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 4001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
