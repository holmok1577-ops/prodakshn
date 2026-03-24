#!/bin/bash

echo "Запуск сервера вебхуков ЮKassa..."

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
    echo "Ошибка: Файл .env не найден!"
    echo "Скопируйте .env.example в .env и заполните значения"
    exit 1
fi

if [ ! -d "logs" ]; then
    mkdir logs
fi

if ! command -v pm2 &> /dev/null; then
    echo "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
fi

pm2 start ecosystem.config.js

echo "Сервер запущен!"
echo "Проверка статуса: pm2 status"
echo "Логи: pm2 logs yookassa-webhook"
echo "Остановка: pm2 stop yookassa-webhook"
