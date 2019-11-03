## ProObject7 (fix0) 로그를 Web에서 볼 수 있도록 해주는 프로그램.

1. Build  
- dependencies
  - npm ( > 6.10 )
  
- build & deploy
  - Websocker proxy server
    - deploy
      - source: ${project_dir}/server
      - target: server@${app_dir}
  - Client web app
    - react project build
      - ${project_dir} 에서 npm run-script build 입력
    - react app deploy
      - source: ${project_dir}/build
      - target: server@${app_dir}/html

2. 서버 구축 방법
- dependencies:
  - Docker image를 이용할 경우  
    - docker, docker-compose( > 1.18.0 )
  - bare metal에 설치할 경우
    - npm ( > 6.10 )
    - npm packages ( version test 안해봄 )
      - fs
      - html
      - express
      - ssh2
      - websocket
      - http
  
- 구축
  - docker와 docker compose를 이용하는 경우
    - ${project_dir}/image 하위의 Dockerfile, docker-compose.yaml 파일을 서버로 전송
    - docker-compose.yaml 파일의 services.pologwebviewer.volumes 의 host directory를 ${app_dir} (원하는 디렉토리로 사용)로 수정
    - docker-compose up && docker-compose start
    - 해당 ${app_dir} 에 build/deploy
  - bare metal 에 사용하는 경우
    - 스스로 해 볼 것