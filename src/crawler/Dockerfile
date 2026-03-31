FROM node:lts-alpine

RUN apk add --no-cache bash curl git openssh-client && rm -rf /var/cache/apk/*

WORKDIR /app

COPY . .

RUN npm ci

CMD node index.js
