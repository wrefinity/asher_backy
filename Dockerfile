# Use Node 20 Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install system deps needed by Prisma & Sharp
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Copy prisma schema BEFORE npm install
COPY prisma ./prisma

# Install dependencies (this will now succeed)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy remaining source code
COPY . .

# Expose port if needed
# EXPOSE 5000

# Start app (use node in prod)
CMD ["npm", "start"]
