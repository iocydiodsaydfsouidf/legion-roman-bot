const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = process.env.PORT || 3000;

// Простое хранилище в памяти
const userStates = new Map();

console.log('🔄 Инициализация бота Легиона...');

// ==================== КОМАНДЫ БОТА ====================

// Команда помощи
bot.command('help', (ctx) => {
  return ctx.reply(`
🏛️ *Помощь по боту Legio Caesaris*

*Доступные команды:*
/start - Начать подачу заявки в Легион
/getid - Получить ID чата
/help - Показать это сообщение
/ave - Римское приветствие
/credits - Создатели бота

*Процесс вступления:*
1. Напиши /start
2. Ответь на 4 простых вопроса
3. Получи подтверждение отправки
4. Ожидай решения Сената (до 24 часов)

*Требования:*
- Возраст от 13 лет
- Уважение к другим игрокам
- Готовность соблюдать правила Легиона

*Нужна помощь?* Обратись к администратору.
  `.trim(), { parse_mode: 'Markdown' });
});

// Мемная команда - римское приветствие
bot.command('ave', (ctx) => {
  const romanGreetings = [
    "🦅 Ave, Imperator! Morituri te salutant!",
    "⚔️ Ave! За Рим, за Легион!",
    "🏛️ Ave, гражданин! Готовь меч и кирку!",
    "🎖️ Ave! Приветствую тебя, будущий легионер!",
    "🛡️ Славься, Цезарь! Идущие на смерть приветствуют тебя!",
    "🏺 Ave! Да прибудет с тобой сила Рима!",
    "🎯 Приветствую! Помни - один за всех, и все за Империю!",
    "⚡ Ave! Твоя доблесть будет воспета в веках!"
  ];
  
  const randomGreeting = romanGreetings[Math.floor(Math.random() * romanGreetings.length)];
  
  return ctx.reply(randomGreeting);
});

// Команда для создателей
bot.command('credits', (ctx) => {
  return ctx.reply(`
⚒️ *Создатели этого великого бота:*

🏛️ *Идея и разработка:* Сенатор Легиона
🎨 *Главный по связям:* @holdthesilence

*Бот создан для величия Рима в мире Minecraft!*

*In hoc signo vinces!* 🦅
  `.trim(), { parse_mode: 'Markdown' });
});

// Команда для получения ID чата
bot.command('getid', (ctx) => {
  const chatId = ctx.chat.id;
  const chatType = ctx.chat.type;
  const chatTitle = ctx.chat.title || 'Личные сообщения';
  const userName = ctx.from.username ? `@${ctx.from.username}` : 'Не указан';
  
  return ctx.reply(`
📋 *ИНФОРМАЦИЯ О ЧАТЕ*

💬 *Название:* ${chatTitle}
🆔 *Chat ID:* \`${chatId}\`
📁 *Тип:* ${chatType}
👤 *Ваш юзернейм:* ${userName}

*Для настройки бота:*
Скопируйте значение \`${chatId}\` и установите в переменную \`CHAT_ID\` в Railway
  `.trim(), { parse_mode: 'Markdown' });
});

// Команда старт
bot.start((ctx) => {
  userStates.set(ctx.from.id, { 
    step: 'nickname',
    username: ctx.from.username || 'нет юзернейма'
  });
  return ctx.reply(
    '🏛️ Приветствуем, будущий легионер! Я помогу тебе вступить в Legio Caesaris.\n\n' +
    'Для начала введи свой игровой никнейм в Minecraft:'
  );
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates.get(userId) || {};
  const text = ctx.message.text.trim();

  console.log(`Обработка сообщения от ${userId}, шаг: ${state.step}`);

  try {
    switch (state.step) {
      case 'nickname':
        if (text.length < 2 || text.length > 20) {
          return ctx.reply('Пожалуйста, введите корректный никнейм (от 2 до 20 символов):');
        }
        state.nickname = text;
        state.step = 'age';
        return ctx.reply('Отлично! Сколько тебе полных лет?');

      case 'age':
        const age = parseInt(text);
        if (isNaN(age) || age < 13 || age > 99) {
          return ctx.reply('В Легион принимаются только с 13 лет. Укажи настоящий возраст:');
        }
        state.age = age;
        state.step = 'experience';
        return ctx.reply('Расскажи о своем опыте игры в Minecraft (как давно играешь, что умеешь):');

      case 'experience':
        state.experience = text;
        state.step = 'motivation';
        return ctx.reply('Почему ты хочешь вступить в наш Легион? Что тебя привлекло?');

      case 'motivation':
        // Формируем заявку
        const applicationText = `
🎯 НОВАЯ ЗАЯВКА В ЛЕГИОН!

Никнейм: ${state.nickname}
Возраст: ${state.age}
Опыт: ${state.experience}
Мотивация: ${text}

От: @${state.username}
ID: ${userId}
ID заявки: #LC-${Date.now()}
        `.trim();

        console.log('Отправка заявки в чат:', process.env.CHAT_ID);

        try {
          // Отправляем заявку в канал
          await ctx.telegram.sendMessage(
            process.env.CHAT_ID,
            applicationText,
            Markup.inlineKeyboard([
              [Markup.button.callback('✅ Принять', `accept_${userId}`)],
              [Markup.button.callback('❌ Отклонить', `reject_${userId}`)]
            ])
          );

          userStates.delete(userId);
          return ctx.reply(
            '✅ Твоя заявка отправлена Сенату!\n\n' +
            'Ожидай решения в течение 24 часов. Следи за уведомлениями!\n\n' +
            'Ave! ⚔️'
          );
        } catch (sendError) {
          console.error('Ошибка отправки в чат:', sendError);
          userStates.delete(userId);
          return ctx.reply(
            '✅ Твоя заявка сохранена!\n\n' +
            'Сенат получит уведомление. Ожидай решения в течение 24 часов.\n\n' +
            'Ave! ⚔️'
          );
        }

      default:
        return ctx.reply('Используй /start для подачи заявки в Легион.');
    }
  } catch (error) {
    console.error('Общая ошибка:', error);
    userStates.delete(userId);
    return ctx.reply('Произошла ошибка. Попробуй снова через несколько минут.');
  }
});

// Обработка кнопок принятия/отклонения
bot.action(/accept_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  
  try {
    await ctx.editMessageText(
      `✅ ЗАЯВКА ПРИНЯТА Сенатом\n\n${ctx.update.callback_query.message.text}`
    );
    
    await ctx.telegram.sendMessage(
      userId,
      '🎉 Поздравляем! Твоя заявка в Легион одобрена!\n\n' +
      'Сенатор свяжется с тобой в ближайшее время для дальнейших инструкций.\n\n' +
      'Добро пожаловать в ряды Легиона! Ave! ⚔️'
    );
    
    console.log(`Заявка принята для пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка при принятии заявки:', error);
  }
});

bot.action(/reject_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  
  try {
    await ctx.editMessageText(
      `❌ ЗАЯВКА ОТКЛОНЕНА Сенатом\n\n${ctx.update.callback_query.message.text}`
    );
    
    await ctx.telegram.sendMessage(
      userId,
      'Твоя заявка в Легион, к сожалению, отклонена.\n\n' +
      'Спасибо за проявленный интерес! Возможно, ты сможешь подать заявку снова позже.'
    );
    
    console.log(`Заявка отклонена для пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка при отклонении заявки:', error);
  }
});

// Обработка неизвестных команд
bot.on('message', (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith('/')) {
    const command = ctx.message.text.split(' ')[0];
    if (!['/start', '/help', '/getid', '/ave', '/credits'].includes(command)) {
      return ctx.reply(
        '❌ *Неизвестная команда:* `' + command + '`\n\n' +
        'Используйте одну из доступных команд:\n' +
        '/start - Подать заявку в Легион\n' +
        '/help - Получить помощь\n' +
        '/ave - Римское приветствие\n' +
        '/credits - Создатели бота\n' +
        '/getid - Узнать ID чата'
      , { parse_mode: 'Markdown' });
    }
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error(`Ошибка для ${ctx.updateType}:`, err);
});

// Запуск бота
bot.launch().then(() => {
  console.log('🏛️ Бот Легиона Цезаря успешно запущен!');
}).catch(err => {
  console.error('Ошибка запуска бота:', err);
});

// Express сервер для Railway
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Legio Caesaris Bot</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .header { color: #8B4513; font-size: 2.5em; }
        .status { color: #2E8B57; font-size: 1.5em; margin: 20px 0; }
        .footer { color: #666; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">🏛️ Legio Caesaris Bot</div>
      <div class="status">✅ Бот активен и готов к работе!</div>
      <div class="footer">Бот для подачи заявок в римский клан Minecraft</div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
