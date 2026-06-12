FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers openssl

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

RUN mkdir -p /app/logs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/server.js"]
