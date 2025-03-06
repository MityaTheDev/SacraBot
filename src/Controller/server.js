const express = require("express");
const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const { styleText } = require("node:util");

const app = express();
const port = serverConfig.port;

// HTTP server for initial setup
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Bot Control Server is running.");
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

// Store connected bots
const bots = new Map();

wss.on("connection", (ws) => {
  console.log(`New bot connected`);
  let botId = -1;

  // Handle messages from the bot
  ws.on("message", (message) => {
    console.log(
      `${styleText("yellow", "Received from ")}` +
        `${styleText("greenBright", message.info.prefix)}` +
        `${styleText("yellow", "of type ")}` +
        `${styleText("green", message.type)}`
    );
    console.log(`${styleText("white", "message.body: " + message.body)}`);
    //do smth with the message

    if (message.type === "init") {
      botId = message.info.browserID;
      bots.set(botId, ws);
    }
    console.log("bots:", bots);
  });

  // Handle bot disconnection
  ws.on("close", () => {
    console.log(`Bot ${botId} has disconnected`);
    bots.delete(botId);
  });
});

// Send commands to a specific bot
function sendCommand(botId, command) {
  const bot = bots.get(botId);
  if (bot && bot.readyState === WebSocket.OPEN) {
    bot.send(JSON.stringify({ command }));
    console.log(`Command sent to bot ${botId}: ${command}`);
  } else {
    console.log(`Bot ${botId} not found or disconnected`);
  }
}
