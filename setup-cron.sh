#!/bin/bash

echo "Настройка cron для проверки здоровья сервера..."

cd "$(dirname "$0")"

CRON_JOB="*/10 * * * * $(pwd)/cron-health-check.sh"

(crontab -l 2>/dev/null | grep -v "cron-health-check.sh"; echo "$CRON_JOB") | crontab -

echo "✅ Cron настроен на выполнение каждые 10 минут"
echo "Текущие задачи cron:"
crontab -l | grep "cron-health-check.sh"
