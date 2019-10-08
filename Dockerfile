FROM node:10

# non-root user 'node' is defined by the base image
ENV HOME=/home/node

# copy package.json and package-lock.json
COPY package*.json $HOME/cbpii-sample-js/

WORKDIR $HOME/cbpii-sample-js
RUN npm install

# copy full project code into '$HOME/cbpii-sample-js'
COPY . .

CMD ["node", "server.js"]
