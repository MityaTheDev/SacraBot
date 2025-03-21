const { pause } = require("../time.js");
const express = require("express");
const WebSocket = require("ws");
const serverConfig = require("../../configs/server_config.json");
const { Table } = require("console-table-printer");
const { styleText } = require("node:util");
const readline = require(`readline`);
const ansiEscapes = require("ansi-escapes");
const activityIndicatorSymblos = [
  "⠀",
  "⠁",
  "⠂",
  "⠄",
  "⡀",
  "⡈",
  "⡐",
  "⡠",
  "⣀",
  "⣁",
  "⣂",
  "⣄",
  "⣌",
  "⣔",
  "⣤",
  "⣥",
  "⣦",
  "⣮",
  "⣶",
  "⣷",
  "⣿",
  "⢿",
  "⠿",
  "⡻",
  "⠻",
  "⢛",
  "⠛",
  "⠝",
  "⡙",
  "⠙",
  "⠩",
  "⢉",
  "⠉",
  "⠊",
  "⠌",
  "⡈",
  "⠈",
  "⠐",
  "⠠",
  "⢀",
];
let activityIndicatorSymbolIndex = 0;
const prompt = styleText("yellow", "command> ");
const promptLength = prompt.replaceAll(/\x1B\[[0-9;]*m/gi, "").length;
let currentCommand = "";
let commandCursorPosition = 0;
const app = express();
const port = serverConfig.port;
const printableObjects = {
  // 153: {
  //   ID: 153,
  //   Name: "DqR[1098]",
  //   Level: "10(12)",
  //   Lives: "3",
  //   State: "offline",
  // },
  // 157: {
  //   ID: 157,
  //   Name: "00psie[777]",
  //   Level: "8(10)",
  //   Lives: "1",
  //   State: "offline",
  // },
  // 158: {
  //   ID: 158,
  //   Name: "Gera[1095]",
  //   Level: "9(9)",
  //   Lives: "4",
  //   State: "offline",
  // },
  // 159: {
  //   ID: 159,
  //   Name: "Master-Majat2[1100]",
  //   Level: "9(12)",
  //   Lives: "2",
  //   State: "offline",
  // },
};
let secondsPassed = 0;
const interval = 1000;
let lastCycleTime = 0;
let startTime = Date.now() - interval;
let overallSlippage = 0;

// HTTP server for initial setup
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Bot Control Server is running.");
});

const server = app.listen(port, async () => {
  await listenToInput();
  await print();
});

const wss = new WebSocket.Server({ server });

// Store connected bots
const bots = new Map();

wss.on("connection", (ws) => {
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
    bots.delete(botId);
  });
});

async function print() {
  while (true) {
    const now = Date.now();
    lastCycleTime = now - startTime;
    const slippage = lastCycleTime - interval;
    overallSlippage += slippage;
    startTime = now;
    let output =
      ansiEscapes.clearScreen +
      "\n" +
      (await getTable()) +
      (prompt + currentCommand) +
      ansiEscapes.cursorLeft +
      ansiEscapes.cursorForward(promptLength + commandCursorPosition);
    process.stdout.write(output);
    const elapsedTime = Date.now() - startTime;
    const sleepTime = interval - elapsedTime;
    await pause(sleepTime);
  }
}

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

async function getTable() {
  const table = new Table({
    title: `${await nextSymblol(false)} Server is running ${await nextSymblol(
      true
    )}`,
    columns: [
      { name: "ID", minLen: 3 },
      { name: "Name", minLen: 20 },
      { name: "Level", minLen: 6 },
      { name: "Lives", minLen: 1 },
      { name: "State", minLen: 20 },
    ],
  });
  const colors = ["whiteBright", "yellowBright"];
  let switchingColor = colors[1];
  for (const objectKey in printableObjects) {
    const object = { ...printableObjects[objectKey] };
    for (let key in object) {
      let color = switchingColor;
      if (key === "Lives") {
        switch (object[key]) {
          case "5":
            color = "greenBright";
            break;
          case "4":
            color = "green";
            break;
          case "3":
            color = "yellow";
            break;
          case "2":
            color = "red";
            break;
          case "1":
            color = "redBright";
        }
      }
      if (key === "State") {
        switch (object[key]) {
          case "finished":
            color = "greenBright";
            break;
          case "offline":
            color = "redBright";
        }
      }

      object[key] = styleText(color, "" + object[key]);
    }
    table.addRow(object);
    switchingColor = switchingColor === colors[0] ? colors[1] : colors[0];
  }

  return table.render() + "\n";
}

async function listenToInput() {
  let historyIndex = 0;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt,
  });
  rl.prompt();
  rl.on("line", (input) => {
    currentCommand = "";
    commandCursorPosition = 0;
    historyIndex = -1;
    if (input.trim() === "q") rl.close();
    else rl.prompt();
  }).on("close", () => {
    console.log(styleText("redBright", "\nprogram terminated"));
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

async function nextSymblol(next) {
  const symbol = activityIndicatorSymblos[activityIndicatorSymbolIndex];
  if (next) {
    activityIndicatorSymbolIndex++;
    if (activityIndicatorSymbolIndex == activityIndicatorSymblos.length)
      activityIndicatorSymbolIndex = 0;
  }
  return symbol;
}

exports.listenToInput = listenToInput;
