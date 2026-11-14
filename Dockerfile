FROM nginx:alpine

# 정적 프론트엔드 파일 복사
COPY . /usr/share/nginx/html

EXPOSE 80
