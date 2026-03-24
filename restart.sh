#!/bin/bash

echo "Перезапуск сервера вебхуков ЮKassa..."

cd "$(dirname "$0")"

if pm2 describe yookassa-webhook &> /dev/null; then
    pm2 restart yookassa-webhook
    echo "✅ Сервер перезапущен"
    echo ""
    echo "Статус:"
    pm2 status
else
    echo "⚠️  Сервер не запущен. Запускаем..."
    ./start.sh
fi
