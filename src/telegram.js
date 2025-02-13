const logger = require("./logger");
const telegramConfig = require(`../configs/telegram_config.json`);

const BOT_TOKEN = telegramConfig.token;
const CHAT_ID = telegramConfig.chat_id;

async function sendMessage(message) {
  message = message.replace(/[[\]()~>#+-=|{}.!-]/g, "\\$&");
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "MarkdownV2",
      }),
    });

    const data = await response.json();
    logger.log("Message sent successfully: " + data.ok, {
      prefix: `[Telegram]`,
      prefixModifiers: ["grey"],
      messageModifiers: ["grey"],
    });
  } catch (error) {
    logger.error("Error sending message:", error);
  }
}

exports.sendMessage = sendMessage;
