FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

# Apply migrations to Railway DB
RUN npx prisma migrate deploy

# Generate client after DB is up-to-date
RUN npx prisma generate

RUN npx tsc

ENV NODE_ENV=production

CMD ["npm", "start"]