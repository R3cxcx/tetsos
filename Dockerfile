FROM node:18-alpine
WORKDIR /app

# نسخ ملفات الباكيجات وتثبيت
COPY package*.json ./
RUN npm ci

# نسخ بقية المشروع والبناء
COPY . .
RUN npm run build

# تثبيت serve لتقديم الملفات
RUN npm i -g serve

EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
