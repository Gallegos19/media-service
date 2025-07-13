# Usa Node 18
FROM node:18-alpine

# Dependencias del sistema para Prisma y build
RUN apk add --no-cache openssl python3 make g++ git

WORKDIR /app

# Copia package.json y lock para instalar dependencias
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Instala todas las dependencias (prod + dev)
RUN npm install

# Genera el cliente de Prisma
RUN npx prisma generate

# Copia el resto del código fuente
COPY . .

# Compila TypeScript
RUN npm run build 2>&1 | tee build.log || (cat build.log && exit 1)

# Elimina devDependencies (pero NO las de prod)
RUN npm prune --production

# Arranca usando ambos resolvers
CMD ["node", "-r", "module-alias/register", "-r", "tsconfig-paths/register", "dist/server.js"]