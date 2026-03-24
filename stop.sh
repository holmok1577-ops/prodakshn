#!/bin/bash

echo "Остановка сервера вебхуков ЮKassa..."

cd "$(dirname "$0")"

if pm2 describe yookassa-webhook &> /dev/null; then
    pm2 stop yookassa-webhook
    pm2 delete yookassa-webhook
    echo "✅ Сервер остановлен"
else
    echo "⚠️  Сервер не запущен"
fi
