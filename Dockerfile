FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate
RUN npx tsc

ENV NODE_ENV=production

# ✅ Run migrations at runtime, then start app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
