const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const serverUrl = "ws://" + serverConfig.ip + ":" + serverConfig.port;
const ws = new WebSocket(serverUrl);
const logger = require("../logger");
logger.setDefaultOptions({
  prefixModifiers: ["magenta"],
  timestampModifiers: ["magenta"],
  messageModifiers: ["magenta"],
});
const baseMessage = {
  type: "",
  info: {
    browserID: "",
    heroPrefix: "",
  },
  body: "",
};

async function init(hero) {
  baseMessage.info.browserID = hero.browserID;
  baseMessage.info.heroPrefix = hero.prefix;

  ws.on("open", () => {
    const message = { ...baseMessage };
    message.type = "init";
    message.body = "this one is alive";
    ws.send(JSON.stringify(message));
    logger.log(`Connected to server`);
  });

  ws.on("message", (messageRaw) => {
    const message = JSON.parse(messageRaw);
    logger.log(`Received command from server: ${message.command}`);

    // Execute the command (e.g., start/stop the bot)
    if (data.command === "test") {
      console.log("command [test] received...");
    } else {
      console.log("unknown command");
    }
  });

  ws.on("close", () => {
    console.log("Disconnected from server");
  });
}

async function sendState(stateInfo) {
  const message = { ...baseMessage };
  message.type = "state";
  message.body = stateInfo;
  ws.send(JSON.stringify(message));
}

exports.init = init;
exports.sendState = sendState;
