/**
 * Точка входа для серверной части приложения.
 * Используется Fastify для обработки как REST API, так и WebSocket соединений.
 * Назначение: инициализация сервера, подключение роутов и запуск игрового движка.
 */
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { GameRoom } from './ws/game-room.js';
import { registerHistoryRoute } from './routes/history.js';
import { registerVerifyRoute } from './routes/verify.js';

const PORT = 3001;

async function main() {
  const app = Fastify({ logger: true });

  // Настройка CORS для разрешения кросс-доменных запросов от клиента
  await app.register(fastifyCors, { origin: true });
  // Подключение плагина для поддержки WebSocket
  await app.register(fastifyWebsocket);

  // Создаем инстанс игровой комнаты, который управляет клиентами и логикой движка
  const gameRoom = new GameRoom();

  // Настройка маршрута (роута) для WebSocket подключений
  app.get('/ws', { websocket: true }, (socket) => {
    // При подключении добавляем клиента в игровую комнату
    gameRoom.addClient(socket);

    // Слушаем входящие сообщения от клиента (например, ставки, кэшауты)
    socket.on('message', (raw) => {
      gameRoom.handleMessage(socket, raw.toString());
    });

    // Обрабатываем отключение клиента
    socket.on('close', () => {
      gameRoom.removeClient(socket);
    });

    // Логируем и корректно удаляем клиента при ошибке соединения
    socket.on('error', (err) => {
      app.log.error(err, 'WebSocket error');
      gameRoom.removeClient(socket);
    });
  });

  // REST API маршруты
  // Хелсчек (Health Check) для проверки живости сервера
  app.get('/api/health', async () => ({ status: 'ok' }));
  
  // Регистрация маршрута для получения истории раундов
  registerHistoryRoute(app, gameRoom);
  // Регистрация маршрута для верификации (Provably Fair) логики раунда
  registerVerifyRoute(app, gameRoom);

  // Запуск сервера на указанном порту 
  await app.listen({ port: PORT, host: '0.0.0.0' });
  
  // Старт основного игрового цикла комнаты после запуска сервера
  gameRoom.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
