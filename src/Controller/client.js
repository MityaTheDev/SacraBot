const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const serverUrl = "ws://" + serverConfig.ip + ":" + serverConfig.port;
const ws = new WebSocket(serverUrl);
const baseMessage = {};

async function init(hero, logger) {
  const initMessage = {
    type: "init",
    info: {
      browserID: hero.browserID,
      heroPrefix: hero.prefix,
    },
    body: "",
  };

  ws.on("open", () => {
    ws.send(initMessage);
    logger.log(`Connected to server`, {
      timestampModifiers: ["magenta", "dim"],
      prefixModifiers: ["magenta", "dim"],
      messageModifiers: ["magenta", "dim"],
    });
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    logger.log(`Received command from server: ${data.command}`, {
      prefixModifiers: ["magenta", "dim"],
      messageModifiers: ["magenta", "dim"],
    });

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

async function sendState(senderInfo, message) {
  ws.send(JSON.stringify({ info: senderInfo, message: message }));
}
