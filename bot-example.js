// Пример кода для Telegram-бота (создание платежа в ЮKassa)
// Этот код должен быть в вашем Telegram-боте, не в webhook сервере

const axios = require('axios');

const YOOKASSA_SECRET_KEY = 'live_akopCQ8XXXXXXXXXXXXjA8hACwRkqPV5fV-UFnYje4Ck';
const YOOKASSA_SHOP_ID = '111111111';
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
        'Idempotence-Key': `${Date.now()}-${telegramId}`  // Для предотвращения дубликатов
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка создания платежа:', error.response?.data || error.message);
    throw error;
  }
}

// Пример использования в Telegram-боте
async function handlePaymentCommand(ctx) {
  const telegramId = ctx.from.id;
  const amount = 299.00;
  const description = 'Доступ к боту';
  const returnUrl = 'https://yourbot.ru/thanks';

  try {
    const payment = await createPayment(telegramId, amount, description, returnUrl);
    
    const confirmationUrl = payment.confirmation.confirmation_url;
    
    await ctx.reply(
      `🔗 Для оплаты перейдите по ссылке:\n\n${confirmationUrl}\n\n` +
      `💰 Сумма: ${amount} RUB\n` +
      `📝 Описание: ${description}`
    );
    
  } catch (error) {
    await ctx.reply('❌ Ошибка создания платежа. Попробуйте позже.');
  }
}

module.exports = { createPayment, handlePaymentCommand };

// Для проверки статуса платежа
async function checkPaymentStatus(paymentId) {
  try {
    const response = await axios.get(`${YOOKASSA_API_URL}/${paymentId}`, {
      auth: {
        username: YOOKASSA_SHOP_ID,
        password: YOOKASSA_SECRET_KEY
      }
    });

    return response.data;
  } catch (error) {
    console.error('Ошибка проверки статуса:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { createPayment, handlePaymentCommand, checkPaymentStatus };
