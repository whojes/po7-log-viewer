FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN rm /etc/localtime && cp -p /usr/share/zoneinfo/Asia/Seoul /etc/localtime 
RUN apt-get update && apt-get install -yq locales locales-all && locale-gen ko_KR.UTF-8
ENV TZ=Asia/Seoul \ 
    LANG=ko_KR.UTF-8 \ 
    LANGUAGE=ko_KR.UTF-8 \
    LC_ALL=ko_KR.UTF-8

RUN env
CMD ["npm", "start"]

# Docker run command
# docker run -d -v /home/whojes/workspace/po-log-viewer/:/usr/src/app/ -p6754:6754 --name powhojes -p16754:16754 node_whojes