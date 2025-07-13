# Use the same Node version as specified in package.json
FROM node:18-alpine

# Install dependencies needed for Prisma and other build tools
RUN apk add --no-cache openssl python3 make g++

# Create app directory
WORKDIR /app

# Install dependencies first for better caching
COPY package.json ./
RUN if [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy Prisma schema
COPY prisma/schema.prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
