FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY backend/api/package.json backend/api/
RUN npm install --workspace @hyrm/shared --workspace @hyrm/api --include-workspace-root
COPY shared shared
COPY backend/api backend/api
RUN npm run build -w @hyrm/shared
RUN npm run build -w @hyrm/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/backend/api/dist ./backend/api/dist
COPY --from=builder /app/backend/api/package.json ./backend/api/package.json
WORKDIR /app/backend/api
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
