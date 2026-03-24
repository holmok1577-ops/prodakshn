#!/bin/bash

echo "🚀 Скрипт развертывания сервера ЮKassa Webhook (Docker)"
echo "======================================================"

cd "$(dirname "$0")"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    echo "Установите Docker: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

echo "✅ Docker версия: $(docker --version)"

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    echo "Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker Compose версия: $(docker-compose --version)"

# Проверка .env
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  Файл .env не найден"
    echo "Создаю из .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  ВАЖНО: Отредактируйте .env и заполните реальные значения!"
    echo "   nano .env"
    echo ""
    read -p "Нажмите Enter после редактирования .env..."
fi

# Создание директории для логов
if [ ! -d "logs" ]; then
    mkdir logs
    echo "✅ Создана директория logs"
fi

# Остановка старого контейнера если существует
if docker-compose ps | grep -q "yookassa-webhook"; then
    echo ""
    echo "🛑 Остановка старого контейнера..."
    docker-compose down
fi

# Сборка и запуск контейнера
echo ""
echo "🚀 Сборка и запуск контейнера..."
docker-compose up -d --build

echo ""
echo "✅ Контейнер успешно запущен!"
echo ""
echo "📊 Статус:"
docker-compose ps
echo ""
echo "📋 Команды управления:"
echo "  Проверка логов:   docker-compose logs -f yookassa-webhook"
echo "  Перезапуск:       docker-compose restart"
echo "  Остановка:        docker-compose down"
echo "  Статус:          docker-compose ps"
echo "  Вход в контейнер: docker-compose exec yookassa-webhook sh"
echo ""
echo "🔧 Следующие шаги:"
echo "  1. Настройте Nginx (см. nginx.conf.example)"
echo "  2. Получите SSL сертификат: sudo certbot --nginx -d ваш-домен.ru"
echo "  3. Укажите webhook URL в кабинете ЮKassa"
echo "  4. Настройте cron для мониторинга: ./setup-cron-docker.sh"
echo ""
echo "✅ Развертывание завершено!"