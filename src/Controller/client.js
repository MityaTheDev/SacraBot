const { pause } = require("../time");
const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const serverUrl = "ws://" + serverConfig.ip + ":" + serverConfig.port;
let ws = new WebSocket(serverUrl);
const logger = require("../logger");
const baseMessage = {
  type: "",
  ID: "",
  Name: "",
  Level: "",
  Lives: "",
  // "Last scene": "",
  State: "",
};

async function init(hero) {
  baseMessage.ID = hero.browserID;
  baseMessage.Name = `${hero.name}[${hero.ID}]`;

  ws.on("open", () => {
    const message = { ...baseMessage };
    message.type = "init";
    message.State = "initialized";
    ws.send(JSON.stringify(message));
    logger.log(`Connected to server`),
      {
        prefixModifiers: ["magenta"],
        timestampModifiers: ["magenta"],
        messageModifiers: ["magenta"],
      };
  });

  ws.on("unexpected-response", () => {
    console.log("unexpected");
  });

  ws.on("message", (messageRaw) => {
    const message = JSON.parse(messageRaw);
    logger.log(`Received command from server: ${message.command}`, {
      prefixModifiers: ["magenta"],
      timestampModifiers: ["magenta"],
      messageModifiers: ["magenta"],
    });

    // Execute the command (e.g., start/stop the bot)
    if (data.command === "test") {
      console.log("command [test] received...");
    } else {
      console.log("unknown command");
    }
  });

  ws.on("close", async () => {
    console.log("Closing connection...");
    ws.close();
    // await pause(2000);
    // console.log("Reconnecting...");
    // ws = new WebSocket(serverUrl);
    // await init(hero);
  });

  ws.on("error", async () => {
    logger.error("Error occured while connecting to server...");
    ws.close();
    await pause(2000);
  });
}

async function sendState(hero, stateInfo) {
  const message = { ...baseMessage };
  message.type = "state";
  message.State = stateInfo;
  message.Level = `${hero.currentLevel}(${hero.virtualLevel})`;
  message.Lives = hero.currentLives;
  // message["Last scene"] = hero.lastScene;
  ws.send(JSON.stringify(message));
}

async function getWs() {
  return ws;
}

exports.init = init;
exports.sendState = sendState;
exports.getWs = getWs;
