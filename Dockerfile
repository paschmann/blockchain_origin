FROM node:13-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

ENV HTTP_PORT=3001
ENV P2P_PORT=6001
ENV NODE_NAME=Manufacturing

COPY . .

EXPOSE ${HTTP_PORT} ${P2P_PORT}
CMD [ "node", "./server/index.js" ]