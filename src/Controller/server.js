const { pause } = require("../time.js");
const express = require("express");
const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const { Table } = require("console-table-printer");
const { styleText } = require("node:util");
const readline = require(`readline`);
const ansiEscapes = require("ansi-escapes");
const prompt = styleText("yellow", "command> ");
let currentCommand = "";
let commandCursorPosition = 0;
const app = express();
const port = serverConfig.port;
const printableObjects = {};
const oldObjects = {};

// const dim = "dim";
// const colors = [
//   "black",
//   "red",
//   "green",
//   "yellow",
//   "blue",
//   "magenta",
//   "cyan",
//   "white",
//   "gray",
//   "redBright",
//   "greenBright",
//   "yellowBright",
//   "blueBright",
//   "magentaBright",
//   "cyanBright",
//   "whiteBright",
// ];
// const reset = "\x1b[0m";
// const text = "Wow! What a string of text this is...";
// console.log("\x1b[33m" + text + reset);
// console.log("\x1b[33;2m" + text + reset);
// console.log("\x1b[33;1m" + text + reset);
// console.log("\x1b[33;2;1m" + text + reset);
// for (let color of colors) {
//   console.log(`${color}: ${styleText(color, text)}`);
//   console.log(`${color}(dim): ${styleText([color, dim], text)}`);
// }

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
  // return;
  let botId = -1;

  ws.on("message", (messageRaw) => {
    const message = JSON.parse(messageRaw);
    switch (message.type) {
      case "init":
        botId = message.ID;
        bots.set(botId, ws);
      case "state":
        delete message.type;
        printableObjects[botId] = message;
        break;
    }
  });

  ws.on("close", () => {
    printableObjects[botId].State = "offline";
    // printTable();
    bots.delete(botId);
  });
});

(async () => {
  while (true) {
    const startTime = Date.now();
    process.stdout.write(ansiEscapes.cursorHide);
    process.stdout.write(ansiEscapes.clearScreen);
    printTable();
    process.stdout.write(prompt + currentCommand);
    process.stdout.write(ansiEscapes.cursorShow);
    const sleepTime = 1000 - (Date.now() - startTime);
    await pause(sleepTime);
  }
})();

// setInterval(async () => {
//   process.stdout.write(ansiEscapes.cursorHide);
//   process.stdout.write(ansiEscapes.clearScreen);
//   printTable();
//   process.stdout.write(prompt + currentCommand);
//   process.stdout.write(ansiEscapes.cursorShow);
// }, 1500);

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

function printTable() {
  const table = new Table();
  const colors = ["whiteBright", "yellowBright"];
  let switchingColor = colors[1];
  for (let objectKey in printableObjects) {
    const object = printableObjects[objectKey];
    for (let key in object) {
      let color = switchingColor;
      if (key === "Level" && object[key] == 12) color = "greenBright";
      if (key === "Lives") {
        switch (object[key]) {
          case 5:
            color = "greenBright";
            break;
          case 4:
            color = "green";
            break;
          case 3:
            color = "yellow";
            break;
          case 2:
            color = "red";
            break;
          case 1:
            color = "redBright";
        }
      }
      object[key] = styleText(color, "" + object[key]);
    }
    table.addRow(printableObjects[objectKey], { color: switchingColor });
    switchingColor = switchingColor === colors[0] ? colors[1] : colors[0];
  }
  table.render();
  table.printTable();
}

function listenToInput() {
  let historyIndex = 0;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt,
  });
  rl.prompt();
  rl.on("line", async (input) => {
    // console.log(`history:`, rl.history);
    // console.log(`historyIndex: ${historyIndex}[${rl.history[historyIndex]}]`);
    // console.log("input:", input);
    // console.log("position:", commandCursorPosition);
    // console.log("current command:", currentCommand);
    currentCommand = "";
    commandCursorPosition = 0;
    historyIndex = -1;
    if (input.trim() === "q") rl.close();
    else rl.prompt();
  }).on("close", () => {
    console.log("Goodbye!");
    process.exit(0);
  });

  rl.input.on("keypress", (key, data) => {
    // console.log("key:", data);
    // Up arrow
    if (data.sequence === "\x1B[A") {
      if (rl.history.length > 0) {
        if (historyIndex < rl.history.length) historyIndex++;
        currentCommand = rl.history[historyIndex]
          ? rl.history[historyIndex]
          : "";
        commandCursorPosition = currentCommand.length;
      }
      return;
    }
    // Down arrow
    else if (data.sequence === "\x1B[B") {
      if (rl.history.length > 0) {
        if (historyIndex >= 0) historyIndex--;
        currentCommand = rl.history[historyIndex]
          ? rl.history[historyIndex]
          : "";
        commandCursorPosition = currentCommand.length;
      }
      return;
    }
    // Right arrow
    else if (data.sequence === "\x1B[C") {
      if (commandCursorPosition < currentCommand.length)
        commandCursorPosition++;
      return;
    }
    // Left arrow
    else if (data.sequence === "\x1B[D") {
      if (commandCursorPosition > 0) commandCursorPosition--;
      return;
    }
    // Enter key
    else if (data.sequence === "\r") {
      return;
    }
    // Backspace
    else if (data.sequence === "\b") {
      if (commandCursorPosition < 1) return;
      const substringAfterCursorPosition = currentCommand.substring(
        commandCursorPosition
      );
      commandCursorPosition--;
      const substringBeforeCursorPosition = currentCommand.substring(
        0,
        commandCursorPosition
      );
      currentCommand =
        substringBeforeCursorPosition + substringAfterCursorPosition;
    }
    // Delele key
    else if (data.sequence === "\x1B[3~") {
      if (commandCursorPosition >= currentCommand.length) return;
      const substringBeforeCursorPosition = currentCommand.substring(
        0,
        commandCursorPosition
      );
      const substringAfterCursorPosition = currentCommand.substring(
        commandCursorPosition + 1
      );
      currentCommand =
        substringBeforeCursorPosition + substringAfterCursorPosition;
    } else {
      currentCommand =
        currentCommand.slice(0, commandCursorPosition) +
        data.sequence +
        currentCommand.slice(commandCursorPosition);
      commandCursorPosition++;
    }
  });
}

exports.listenToInput = listenToInput;
