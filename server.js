const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/yookassa/webhook', async (req, res) => {
  try {
    console.log('Получен вебхук от ЮKassa:', JSON.stringify(req.body, null, 2));

    const event = req.body.event;
    const payment = req.body.object;

    if (!event || !payment) {
      console.error('Некорректный формат вебхука');
      return res.status(400).json({ error: 'Invalid webhook format' });
    }

    const signature = req.headers['authorization'] || req.headers['Authorization'];
    
    if (!verifyYookassaSignature(req.body, signature)) {
      console.error('Неверная подпись вебхука');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (event === 'payment.succeeded') {
      const telegramId = payment.metadata?.telegram_id;
      
      if (!telegramId) {
        console.error('Отсутствует telegram_id в metadata');
        return res.status(400).json({ error: 'Missing telegram_id' });
      }

      console.log(`Успешная оплата для пользователя ${telegramId}`);
      
      await notifyTelegramBot(telegramId, payment);
      
      console.log(`Доступ предоставлен пользователю ${telegramId}`);
    } else if (event === 'payment.waiting_for_capture') {
      console.log('Платеж ожидает подтверждения:', payment.id);
    } else if (event === 'payment.canceled') {
      console.log('Платеж отменен:', payment.id);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки вебхука:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function verifyYookassaSignature(payload, signature) {
  if (!signature) {
    console.warn('Отсутствует подпись в заголовке');
    return false;
  }

  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!secretKey) {
    console.error('Отсутствует YOOKASSA_SECRET_KEY в переменных окружения');
    return false;
  }

  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadString)
    .digest('hex');

  const receivedSignature = signature.replace('Bearer ', '');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );

  if (!isValid) {
    console.error('Подпись не совпадает');
    console.error('Ожидается:', expectedSignature);
    console.error('Получена:', receivedSignature);
  }

  return isValid;
}

async function notifyTelegramBot(telegramId, payment) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    throw new Error('Отсутствует TELEGRAM_BOT_TOKEN');
  }

  const message = `✅ Оплата успешно получена!\n\n` +
    `Сумма: ${payment.amount.value} ${payment.amount.currency}\n` +
    `ID платежа: ${payment.id}\n\n` +
    `Доступ к боту открыт!`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML'
      }
    );

    console.log('Сообщение отправлено в Telegram:', response.data);

    if (process.env.BOT_INTERNAL_API_URL) {
      await axios.post(
        `${process.env.BOT_INTERNAL_API_URL}/api/access/grant`,
        {
          telegram_id: telegramId,
          payment_id: payment.id,
          amount: payment.amount.value,
          currency: payment.amount.currency
        }
      );
      console.log('Доступ предоставлен через внутренний API бота');
    }
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error.response?.data || error.message);
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Сервер вебхуков ЮKassa запущен на порту ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/yookassa/webhook`);
});