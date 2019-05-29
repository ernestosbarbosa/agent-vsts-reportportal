FROM node:alpine

WORKDIR /var/www

RUN npm install -g typescript --silent
COPY . .

EXPOSE 3001

RUN npm install

CMD ["npm", "run", "serve"]
