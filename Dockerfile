# Use an official Node.js image as the base image for building the application
FROM node:20-bullseye as builder

# Create and set the working directory inside the container
RUN mkdir app

# set the working dir
WORKDIR /app

# Copy all the application files to the container's working directory
COPY . .

# Install dependencies using npm
RUN npm install --frozen-lockfile

# Generate Prisma client based on the schema
RUN npx prisma generate

# Compile TypeScript code to JavaScript
RUN npx tsc

# Use another lightweight Node.js image for the final build to save space
FROM node:20-alpine as engine-builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Prisma schema from the previous build stage
COPY --chown=node:node --from=builder /app/prisma/schema/* ./prisma/

# Generate the Prisma client inside the final image
RUN npx prisma generate 
# --schema=./prisma/schema/* ./prisma/

# Final image for running the application
FROM node:20-alpine AS runner

# Set the environment variable to production mode
ENV NODE_ENV=production

# Set the working directory inside the container
WORKDIR /app

# Copy necessary files from the builder stage
COPY --chown=node:node --from=builder /app/package.json .
COPY --chown=node:node --from=builder /app/build .

# Install only production dependencies
RUN npm install --production && npm cache clean --force

# Copy the Prisma client generated in the previous stage
COPY --chown=node:node --from=engine-builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Expose port 5000 for the application
EXPOSE 5000

# Start the application using Node.js
CMD ["node", "src/index.ts"]
