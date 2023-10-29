FROM node:20-alpine3.18

WORKDIR /app

COPY package.json ./
COPY . .

RUN npm install

CMD [ "node", "index.js" ]
