FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY backend/dispatcher/package.json backend/dispatcher/
RUN npm install --workspace @hyrm/shared --workspace @hyrm/dispatcher --include-workspace-root
COPY shared shared
COPY backend/dispatcher backend/dispatcher
RUN npm run build -w @hyrm/shared
RUN npm run build -w @hyrm/dispatcher

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/backend/dispatcher/dist ./backend/dispatcher/dist
COPY --from=builder /app/backend/dispatcher/package.json ./backend/dispatcher/package.json
WORKDIR /app/backend/dispatcher
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
