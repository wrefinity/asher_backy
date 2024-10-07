# Use a lightweight Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./


RUN npm install --include=optional

# Install sharp with platform-specific options
RUN npm install --os=linux --libc=musl --cpu=arm64 sharp

# Install dependencies
RUN npm install

# Copy the rest of the app code
COPY . .

# Expose the port the app will run on
# EXPOSE 5000

# Generate Prisma client
RUN npx prisma generate

# Install nodemon globally
RUN npm install -g nodemon

# Command for starting with nodemon
CMD ["npx", "nodemon"]