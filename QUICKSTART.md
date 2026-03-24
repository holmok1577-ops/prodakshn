# Быстрый старт - Развертывание на Ubuntu 18.04

## Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

## Шаг 2: Загрузка файлов на сервер

```bash
# С локальной машины
scp -r yookassa-webhook/ root@ххххххххххх:/root/

# Или через git
git clone <repository-url>
cd yookassa-webhook
```

## Шаг 3: Настройка переменных окружения

```bash
cd /root/yookassa-webhook
cp .env.example .env
nano .env
```

Заполните:

```env
PORT=3000
YOOKASSA_SECRET_KEY=live_akopхххххххххххххххххххххх
TELEGRAM_BOT_TOKEN=ххххххххххххххххххххххххххххххххх
BOT_INTERNAL_API_URL=http://localhost:8000/api
LOG_LEVEL=info
```

## Шаг 4: Запуск контейнера

```bash
chmod +x deploy.sh
./deploy.sh
```

## Шаг 5: Проверка работы

```bash
# Проверка статуса
docker-compose ps

# Проверка логов
docker-compose logs -f yookassa-webhook

# Проверка health endpoint
curl http://localhost:3000/health
```

Ожидаемый ответ:

```json
{"status":"ok","timestamp":"2024-03-23T..."}
```

## Шаг 6: Настройка Nginx

```bash
# Создание конфига
sudo nano /etc/nginx/sites-available/yookassa-webhook
```

Скопируйте содержимое из `nginx.conf.example` и замените `ваш-домен.ru` на ваш домен.

```bash
# Активация конфига
sudo ln -s /etc/nginx/sites-available/yookassa-webhook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Шаг 7: Получение SSL сертификата

```bash
sudo certbot --nginx -d ваш-домен.ru
```

## Шаг 8: Настройка webhook в ЮKassa

В кабинете ЮKassa укажите:

```
https://ваш-домен.ru/yookassa/webhook
```

## Шаг 9: Настройка cron для мониторинга

```bash
chmod +x setup-cron-docker.sh
./setup-cron-docker.sh
```

## Полезные команды

```bash
# Перезапуск контейнера
docker-compose restart

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f yookassa-webhook

# Вход в контейнер
docker-compose exec yookassa-webhook sh

# Проверка использования ресурсов
docker stats yookassa-webhook
```

## Тестирование webhook

```bash
curl -X POST http://localhost:3000/yookassa/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer live_akopххххххххххххххххххххххххххххххххх" \
  -d '{
    "event": "payment.succeeded",
    "object": {
      "id": "test_payment_123",
      "amount": {
        "value": "299.00",
        "currency": "RUB"
      },
      "metadata": {
        "telegram_id": 123456789
      }
    }
  }'
```

## Важно

- При создании платежа в боте обязательно передавайте `metadata.telegram_id`
- HTTPS обязателен для webhook ЮKassa
- Контейнер автоматически перезапускается при сбоях
- Cron проверяет и перезапускает контейнер каждые 10 минут
