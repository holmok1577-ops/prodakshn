const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/yookassa/webhook';
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

async function testWebhook() {
  console.log('🧪 Тестирование webhook...');
  console.log(`URL: ${WEBHOOK_URL}`);
  console.log('');

  const testPayload = {
    event: 'payment.succeeded',
    object: {
      id: 'test_payment_' + Date.now(),
      status: 'succeeded',
      amount: {
        value: '299.00',
        currency: 'RUB'
      },
      metadata: {
        telegram_id: 123456789
      },
      created_at: new Date().toISOString()
    }
  };

  console.log('📤 Тестовый payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_KEY}`
      }
    });

    console.log('✅ Успешный ответ!');
    console.log(`Status: ${response.status}`);
    console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.error('❌ Ошибка:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

testWebhook();
