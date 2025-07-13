# Use the same Node version as specified in package.json
FROM node:18-alpine

# Install dependencies needed for Prisma and other build tools
RUN apk add --no-cache openssl python3 make g++ git

# Create app directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client (skip if DATABASE_URL not set)
RUN if [ -z "$DATABASE_URL" ]; then \
    echo "Warning: DATABASE_URL not set, skipping prisma generate"; \
    else npx prisma generate; \
    fi

# Copy source files
COPY . .

# Build the application with error output
RUN npm run build 2>&1 | tee build.log || (cat build.log && exit 1)

# Set production environment
ENV NODE_ENV=production

# Clean up dev dependencies (keep tsconfig-paths)
RUN npm prune --production --no-save tsconfig-paths

# Run the application
CMD ["node", "dist/server.js"]
