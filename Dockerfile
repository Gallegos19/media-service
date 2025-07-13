# Use the same Node version as specified in package.json
FROM node:18-alpine

# Install dependencies needed for Prisma and other build tools
RUN apk add --no-cache openssl python3 make g++ git

# Create app directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Install all dependencies including devDependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY . .

# Build the application with error output
RUN npm run build 2>&1 | tee build.log || (cat build.log && exit 1)

# Set production environment
ENV NODE_ENV=production

# Install production dependencies including path resolution packages
RUN npm install --production --no-save tsconfig-paths module-alias

# Run the application with both path resolution systems
CMD ["node", "-r", "module-alias/register", "-r", "tsconfig-paths/register", "dist/server.js"]
