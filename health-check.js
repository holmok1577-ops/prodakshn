const axios = require('axios');

const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

async function checkHealth() {
  console.log(`[${new Date().toISOString()}] Проверка здоровья сервера...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(HEALTH_CHECK_URL, {
        timeout: 10000
      });

      if (response.status === 200 && response.data.status === 'ok') {
        console.log(`[${new Date().toISOString()}] ✅ Сервер работает нормально`);
        return true;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Попытка ${attempt}/${MAX_RETRIES}:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`[${new Date().toISOString()}] Повторная попытка через ${RETRY_DELAY/1000} сек...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  console.error(`[${new Date().toISOString()}] ❌ Сервер недоступен после ${MAX_RETRIES} попыток`);
  console.log(`[${new Date().toISOString()}] Перезапуск сервера...`);

  try {
    const { execSync } = require('child_process');
    execSync('pm2 restart yookassa-webhook', { stdio: 'inherit' });
    console.log(`[${new Date().toISOString()}] ✅ Сервер перезапущен`);
    return false;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Ошибка перезапуска:`, error.message);
    return false;
  }
}

checkHealth().then(isHealthy => {
  process.exit(isHealthy ? 0 : 1);
});
