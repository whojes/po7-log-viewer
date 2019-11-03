FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN rm /etc/localtime && cp -p /usr/share/zoneinfo/Asia/Seoul /etc/localtime
ENV TZ Asia/Seoul

RUN apt-get update && apt-get install -yq locales locales-all
RUN locale-gen ko_KR.UTF-8
ENV LANG ko_KR.UTF-8
ENV LANGUAGE ko_KR.UTF-8
ENV LC_ALL ko_KR.UTF-8

RUN npm init -y && npm install express ssh2 websocket http fs

CMD ["npm", "start"]
