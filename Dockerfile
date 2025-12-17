FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

# Copy dependency files
COPY package*.json ./

# Copy prisma schema early
COPY prisma ./prisma

# Install deps
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript code to JavaScript
RUN npx tsc

# Set the environment variable to production mode
ENV NODE_ENV=production

# Start compiled app
CMD ["npm", "start"]
