# Addis Tiggena web portal — production image (Next.js, served on the Telecloud ECS)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json next.config.mjs next-env.d.ts* ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
# NEXT_PUBLIC_* values are inlined at build time — pass the real API origin as a build arg
ARG NEXT_PUBLIC_API_URL=http://localhost:4001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./
COPY package.json ./
EXPOSE 4000
CMD ["npm", "run", "start"]
