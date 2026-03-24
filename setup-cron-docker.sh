#!/bin/bash

echo "Настройка cron для проверки здоровья Docker контейнера..."

cd "$(dirname "$0")"

CRON_JOB="*/10 * * * * cd $(pwd) && docker-compose restart yookassa-webhook >> logs/cron-restart.log 2>&1"

(crontab -l 2>/dev/null | grep -v "docker-compose restart yookassa-webhook"; echo "$CRON_JOB") | crontab -

echo "✅ Cron настроен на выполнение каждые 10 минут"
echo "Текущие задачи cron:"
crontab -l | grep "docker-compose restart yookassa-webhook"
