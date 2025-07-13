# Stage 1: Builder
FROM node:18-alpine AS builder

# Dependencias del sistema para Prisma y build
RUN apk add --no-cache openssl python3 make g++ git libc6-compat

WORKDIR /app

# Copia package.json y lock para instalar dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Establece una DATABASE_URL dummy SOLO para el build (Prisma la necesita)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Instala dependencias y genera cliente Prisma
RUN npm install --legacy-peer-deps
RUN npx prisma generate

# Copia el resto del código fuente y construye
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

# Dependencias mínimas para runtime y Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copia solo lo necesario desde el builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Permisos para logs si los usas
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs

# Configuración final
USER node
ENV NODE_ENV=production
ENV PORT=3001
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

EXPOSE 3001

# Usa ambos resolvers de alias y paths
CMD ["node", "-r", "module-alias/register", "-r", "tsconfig-paths/register", "dist/server.js"]