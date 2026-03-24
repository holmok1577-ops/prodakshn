# Интеграция ЮKassa с Telegram-ботом

Система для обработки вебхуков от ЮKassa и автоматического предоставления доступа в Telegram-бот после успешной оплаты.

## Архитектура

```
ЮKassa → ххххххх.online (Nginx) → 11.111.111.111 (webhook-service) → Telegram Bot API → Telegram-бот
```

### Компоненты системы

1. **ххххххххх.online** - сервер с доменом и SSL сертификатом
   - Nginx прокси для HTTPS
   - Перенаправляет webhook запросы на сервер бота

2. **11.111.111.111** - сервер бота
   - webhook-service (FastAPI) - обрабатывает webhook
   - Проверяет подпись ЮKassa
   - Активирует подписки в `/app/subscriptions.json`
   - Telegram бот - создает платежи

### Поток оплаты

1. Пользователь инициирует оплату через Telegram-бота
2. Бот создает платеж в ЮKassa с `metadata.telegram_id`
3. Пользователь оплачивает
4. ЮKassa отправляет webhook на `https://ххххххх.online/yookassa/webhook`
5. Nginx проксирует запрос на `11.111.111.111:8001/yookassa/webhook`
6. webhook-service проверяет подпись и извлекает `telegram_id`
7. webhook-service активирует подписку в `/app/subscriptions.json`
8. Пользователь получает доступ в боте

## Данные ЮKassa

- **ShopID:** 1211111
- **API ключ:** `live_akopХХХХХХХХХХХХХХХХхххХХХk`

⚠️ **Важно:** В ЮKassa используется один ключ для всех операций:
- Создание платежей в Telegram-боте
- Проверка webhook подписей в webhook-service

## Настройка сервера ххххххх.online

### Требования

- Ubuntu 18.04+
- Nginx
- SSL сертификат (Let's Encrypt)

### Конфигурация Nginx

Создайте конфиг `/etc/nginx/sites-available/yookassa-webhook`:

```nginx
server {
    listen 80;
    server_name ххххххх.online vds2111116.my-ihor.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name хххххххх.online;

    ssl_certificate /etc/letsencrypt/live/ххххххххххх.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ххххххххххх.online/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Webhook endpoint - проксируем на сервер бота
    location /yookassa/webhook {
        proxy_pass http://11.111.111.111:8001/yookassa/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint - локальный
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Все остальные запросы - локальный бэкенд
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/yookassa-webhook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Получение SSL сертификата

```bash
sudo certbot --nginx -d хххххххх.online
```

## Настройка сервера бота (11.111.111.111)

### Требования

- Docker и Docker Compose
- webhook-service (FastAPI)
- Telegram бот

### Развертывание webhook-service

#### 1. Загрузка webhook-service

```bash
scp -r webhook-service/ root@11.111.111.111:/opt/ai-psych/webhook-service
```

#### 2. Добавление в docker-compose.yml

В файл `/opt/ai-psych/docker-compose.yml` добавьте:

```yaml
  webhook-service:
    build: ./webhook-service
    ports:
      - "8001:8001"
    env_file:
      - .env
    volumes:
      - ./:/app
```

**Важно:** `volumes` должен быть таким же, как у бота, чтобы оба сервиса видели `/app/users.json` и `/app/subscriptions.json`.

#### 3. Настройка .env

В файл `/opt/ai-psych/.env` добавьте:

```env
YOOKASSA_SHOP_ID=1211111
YOOKASSA_SECRET_KEY=live_akopххххххххххххххххххххххххх
TELEGRAM_BOT_TOKEN=ххххххххххххххххххххххххххх
```

#### 4. Перезапуск

```bash
ssh root@11.111.111.111 "cd /opt/ai-psych && docker-compose down && docker-compose up -d --build"
```

#### 5. Проверка

```bash
curl http://11.111.111.111:8001/health
```

## Настройка вебхука в ЮKassa

В кабинете ЮKassa укажите:

```
https://хххххххххх.online/yookassa/webhook
```

## Создание платежа в боте

Пример кода для создания платежа в Telegram-боте (см. `bot-example.js`):

```javascript
const axios = require('axios');

const YOOKASSA_SECRET_KEY = 'live_akopхххххххххххххххххххххххххххххх';
const YOOKASSA_SHOP_ID = '1211111';
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

async function createPayment(telegramId, amount, description, returnUrl) {
  try {
    const paymentData = {
      amount: {
        value: amount.toString(),
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      capture: true,
      description: description,
      metadata: {
        telegram_id: telegramId  // ВАЖНО: передаем telegram_id для webhook
      }
    };

    const response = await axios.post(YOOKASSA_API_URL, paymentData, {
      auth: {
        username: YOOKASSA_SHOP_ID,
        password: YOOKASSA_SECRET_KEY
      },
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': `${Date.now()}-${telegramId}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка создания платежа:', error.response?.data || error.message);
    throw error;
  }
}
```

**Важно:** При создании платежа в ЮKassa обязательно передавайте `metadata.telegram_id` - это ID пользователя Telegram, которому нужно предоставить доступ после оплаты.

## API эндпоинты

### POST /yookassa/webhook

Принимает уведомления от ЮKassa.

**Тело запроса:**
```json
{
  "event": "payment.succeeded",
  "object": {
    "id": "payment_id",
    "amount": {
      "value": "299.00",
      "currency": "RUB"
    },
    "metadata": {
      "telegram_id": 123456789
    }
  }
}
```

### GET /health

Проверка здоровья webhook-service.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-23T12:00:00.000Z"
}
```

## Безопасность

- ✅ Проверка HMAC SHA256 подписи ЮKassa (на сервере бота)
- ✅ HTTPS обязательный (на ххххххххх.online)
- ✅ Валидация входных данных (на сервере бота)
- ✅ Логирование всех событий (на сервере бота)
- ✅ Docker изоляция (на сервере бота)

## Troubleshooting

### Вебхуки не приходят

1. Проверьте URL в кабинете ЮKassa: `https://ххххххххх.online/yookassa/webhook`
2. Убедитесь, что HTTPS работает: `curl https://ххххххххх.online/health`
3. Проверьте Nginx логи: `sudo tail -f /var/log/nginx/access.log`
4. Проверьте webhook-service логи на сервере бота: `docker-compose logs -f webhook-service`

### Ошибка "Invalid signature"

Проверьте `YOOKASSA_SECRET_KEY` в `.env` на сервере бота - должен совпадать с ключом в кабинете ЮKassa.

### Webhook-service не запускается

```bash
# На сервере бота
cd /opt/ai-psych
docker-compose logs webhook-service
docker-compose ps
```

### Проблемы с подключением к серверу бота

```bash
# Проверьте доступность webhook-service
curl http://11.111.111.111:8001/health

# Проверьте Nginx конфиг
sudo nginx -t
```

## Тестирование webhook

### Тест через хххххххххх.online

```bash
curl -X POST https://ххххххххх.online/yookassa/webhook \
  -H "Content-Type: application/json" \
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

### Тест напрямую на сервере бота

```bash
curl -X POST http://11.111.111.111:8001/yookassa/webhook \
  -H "Content-Type: application/json" \
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

## Поддержка

### Логи

**На хххххххх.online:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**На сервере бота (11.111.111.111):**
```bash
cd /opt/ai-psych
docker-compose logs -f webhook-service
```

### Контакт

Для вопросов и проблем проверьте логи и свяжитесь с командой разработки.
