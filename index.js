const logger = require("./src/logger.js");
const Ads = require("./src/AdsPower/index");
const puppeteer = require(`./src/BrowserAutomation/puppeteer.js`);
const { pause, SECOND } = require("./src/time.js");
const PptrCfg = require("./configs/puppeteer.json");
const xpath = require("./xpath/xpath.json");
const telegram = require("./src/telegram.js");
const scenes = require("./DATA/scenes.json");
const fs = require("fs");
const path = require("path");
const DateFormat = require("date-format");
const { timeStamp } = require("console");
const { timeout } = require("puppeteer");
const specifiedMode = process.argv[3];
const INSTANCE = process.argv[2];
const configPath = path.join(__dirname, `/configs/instances/${INSTANCE}.json`);
const questsPath = "\\\\DESKTOP-MAIN\\Shared\\quests.json";
// const questsPath = path.join(__dirname, "/DATA/quests.json");
let quests;
let config;
const MODE = Object.freeze({
  DAILY: Symbol("daily"),
  LEVEL: Symbol("level"),
});

async function updateJson(filePath, data) {
  await writeJson(filePath, data);
  return await readJson(filePath);
}

async function writeJson(filePath, data) {
  const jsonData = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(filePath, jsonData, "utf8");
  logger.log(`${filePath.split(`\\`).at(-1)} has been updated`, {
    messageModifiers: ["yellowBright", "dim"],
    timeStampModifiers: ["yellowBright", "dim"],
  });
}

async function readJson(filePath) {
  const data = await fs.promises.readFile(filePath, "utf8");
  const json = JSON.parse(data);
  logger.log(`${filePath.split(`\\`).at(-1)} has been read`, {
    messageModifiers: ["yellowBright", "dim"],
    timeStampModifiers: ["yellowBright", "dim"],
  });
  return json;
}

async function watchJsonChanges(jsonsToWatch) {
  jsonsToWatch.forEach((file) => {
    fs.watch(file, async (eventType, filename) => {
      if (eventType === "change") {
        switch (filename) {
          case "quests.json":
            quests = await readJson(questsPath);
            logger.log(`quests.json has been updated`, {
              messageModifiers: ["yellowBright"],
            });
            break;
          case "config.json":
            config = await readJson(configPath);
            logger.log(`config.json has been updated`, {
              messageModifiers: ["yellowBright"],
            });
            break;
        }
      }
    });
    console.log(`Watching file: ${file}`);
  });
}

async function isOutOfTime(hero) {
  const currentTime = Date.now();
  const minutesLeft =
    hero.sessionMaxDuration -
    (currentTime - hero.sessionStartTime) / (1000 * 60);

  if (minutesLeft <= 0) return true;

  return false;
}

async function setListenerForNewPageCreated(browser) {
  browser.on("targetcreated", async (target) => {
    const newPage = await target.page();
    if (newPage) {
      const url = newPage.url();
      if (url.includes(config.RABBY_WALLET_NOTIFICATION_URL)) {
        //await getTransactionData();
        // logger.log(
        //   "RABBY WALLET",
        //   "Rabby notification detected, signing and confirming transaction...",
        //   ["green", "italic"],
        //   0,
        //   ["green", "italic"],
        //   ["green", "italic"]
        // );
        await sighAndConfirm(newPage);

        // intervalID = setInterval(async () => {
        //   await checkWindowSizeAndMinimize(newPage);
        // }, 300);
      }
    }
  });
}

async function sighAndConfirm(page) {
  if (config.RABBY_WALLET_AUTO_CONFIRM) {
    const signButton = await getElem(
      page,
      xpath.SIGN_BTN_XPATH,
      config.SIGN_WAIT_TIME
    );
    if (signButton) {
      await puppeteer.clickElementByConsole(page, signButton);
      logger.log("Sign button clicked", {
        prefix: "RABBY WALLET",
        importance: 0,
        messageModifiers: ["green", "italic"],
        prefixModifiers: ["italic"],
      });
      await pause(200);
    } else {
      logger.error("Sign button not found", { prefix: "RABBY WALLET" });
    }

    const confirmButton = await getElem(
      page,
      xpath.CONFIRM_BTN_XPATH,
      config.CONFIRM_WAIT_TIME
    );
    if (confirmButton) {
      await puppeteer.clickElementByConsole(page, confirmButton);
      logger.log("Confirm button clicked", {
        prefix: "RABBY WALLET",
        importance: 0,
        messageModifiers: ["green", "italic"],
        prefixModifiers: ["italic"],
      });
    } else {
      logger.error("Confirm button not found", { prefix: "RABBY WALLET" });
    }
  }
}

async function refresh(page) {
  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
}

async function goToHomePage(hero) {
  await hero.page.goto(hero.homeURL, {
    waitUntil: "networkidle0",
  });
}

//todo: add to helper module as time.js
function getTimestamp() {
  return DateFormat.asString("dd-MM_hh.mm", new Date());
}

async function logInRabbyWallet(browser) {
  const page = await browser.newPage();
  await page.goto(config.RABBY_WALLET_LOGIN_URL, {
    waitUntil: "domcontentloaded",
  });
  const inputElem = await getElem(page, xpath.INPUT_PASSWORD_XPATH);
  const buttonElem = await getElem(page, xpath.SUBMIT_BUTTON_XPATH);
  await puppeteer.fillInInputWithoutCheck(
    inputElem,
    config.RABBY_WALLET_PASSWORD
  );
  await puppeteer.clickElementByConsole(page, buttonElem);
  await pause(700);
  await page.close();
}

async function saveFile(data, path) {
  try {
    await fs.writeFile(path, data);
  } catch (err) {
    logger.error("Error writing file\n" + err);
  }
}

async function saveBodyOfPage(page, fileName) {
  try {
    await saveFile(
      await page.evaluate(() => document.querySelector("body").outerHTML),
      `./logs/${fileName}_${getTimestamp()}.html`
    );
  } catch (err) {
    logger.error("Error writing file\n" + err);
  }
}

async function getIDs() {
  let IDs = new Set();
  for (let hero in config.HEROES) {
    if (config.HEROES[hero].active) IDs.add(config.HEROES[hero].browser_id);
  }
  return IDs;
}

async function getBrowsers(IDs) {
  let browsers = [];
  for (let id of IDs) {
    let browserStatusBySN = await Ads.browserStatusBySN(id);
    let isBroswerActive =
      browserStatusBySN && browserStatusBySN.status === "Active" ? true : false;
    await pause(SECOND * 3);
    while (!isBroswerActive) {
      logger.error("Browser is not active");
      logger.error("BrowserStatusBySN: " + browserStatusBySN);
      if (browserStatusBySN)
        logger.error("BrowserStatusBySN.status: " + browserStatusBySN.status);
      await Ads.browserOpenBySN(id);
      browserStatusBySN = await Ads.browserStatusBySN(id);
      isBroswerActive =
        browserStatusBySN && browserStatusBySN.status === "Active"
          ? true
          : false;
      await pause(SECOND * 3);
    }

    const BOT = {};
    BOT._id = id;
    PptrCfg.browserWSEndpoint = browserStatusBySN.ws.puppeteer;
    await puppeteer.CreateBrowser(BOT, PptrCfg);
    let browser = await BOT.browser;

    browsers.push(browser);
  }
  return browsers;
}

async function getElem(page, xpath, timeout = 10000) {
  try {
    await page.waitForSelector("::-p-xpath(" + xpath + ")", {
      timeout: timeout,
    });
    return await page.$("::-p-xpath(" + xpath + ")");
  } catch (error) {
    // logger.error(error);
    return false;
  }
}

async function getElems(page, xpath, timeout = 10000) {
  try {
    await page.waitForSelector("::-p-xpath(" + xpath + ")", {
      timeout: timeout,
    });
    return await page.$$("::-p-xpath(" + xpath + ")");
  } catch (error) {
    logger.error(error);
    resolve(false);
  }
}

/**
 * @param {'innerText' | 'textContent'} option
 */
async function getText(
  page,
  xpath,
  {
    timeout = 10000,
    option = "innerText",
    logError = true,
    multiple = false,
  } = {}
) {
  if (option !== "innerText" && option !== "textContent") {
    throw new Error(
      `'option' parameter in getText() must be 'innerText' or 'textContent' (innerText is default); currently it's '${option}'`
    );
  }

  try {
    await page.waitForSelector("::-p-xpath(" + xpath + ")", {
      timeout: timeout,
    });
    if (multiple) {
      const texts = await page.$$eval(
        "::-p-xpath(" + xpath + ")",
        (elems, option) => {
          return elems.map((elem, option) => {
            return option === "innerText" ? elem.innerText : elem.textContent;
          }, option);
        },
        option
      );
      return texts;
    } else {
      const text = await page.$eval(
        "::-p-xpath(" + xpath + ")",
        (elem, option) => {
          return option === "innerText" ? elem.innerText : elem.textContent;
        },
        option
      );
      return text;
    }
  } catch (error) {
    if (logError) logger.error(error);
    return false;
  }
}

//The page could change while we iterate through scenes.
// For example, the page could be in [loading] scene, this scene would be added
// to result, but then the page could go into [shrine] scene and two scenes
// will be added to result. In that case function would be called again
// recursively with --interationsLeft (important that -- comes before variable
// or recursion would go forever!). If after 3 additional iterations more than 1
// scene is found an error is thrown.
async function getCurrentScene(hero, iterationsLeft = 4) {
  if (iterationsLeft <= 0) {
    await telegram.sendMessage(
      `[${hero.prefix}] failed to accurately detect scene!`
    );
    await saveBodyOfPage(hero.page, `${hero.prefix}_unknownScene`);
    logger.log(
      `failed to accurately detect scene! telegram message sent, scene saved as '${hero.prefix}_unknownScene'`,
      {
        prefix: hero.prefix,
        importance: 1,
        messageModifiers: ["magenta", "underline"],
      }
    );
    return false;
  }

  logger.log("getting scene...", { prefix: hero.prefix, importance: 0 });
  let result = [];

  for (let scene in scenes) {
    let sceneIndicatorXpath = scenes[scene].indicator.xpath;
    let IndicatorXpathDescription = scenes[scene].indicator.description;

    if (await puppeteer.xPathExist(hero.page, sceneIndicatorXpath)) {
      result.push(scene);

      if (
        scene === "transactionProcessing" ||
        scene === "error" ||
        scene === "loading" ||
        scene === "questWaitingForTransacrion" ||
        scene === "questLoading" ||
        scene === "delegationPopup"
      )
        break;
    }
  }

  switch (result.length) {
    case 0:
      logger.log(
        `no scene found, trying again... iterations left: [${iterationsLeft}]`,
        { prefix: hero.prefix, importance: 0, messageModifiers: ["yellow"] }
      );
      await pause(SECOND * 2);
      result = await getCurrentScene(hero, --iterationsLeft);
      break;
    case 1:
      result = result[0];
      break;
    default:
      logger.log(`${result.length} scenes found! [${result}]`, {
        prefix: hero.prefix,
        importance: 0,
        messageModifiers: ["yellow"],
      });
      logger.log(`retrying... iterations left: [${iterationsLeft}]`, {
        prefix: hero.prefix,
        importance: 0,
        messageModifiers: ["yellow"],
      });
      await pause(SECOND * 2);
      result = await getCurrentScene(hero, --iterationsLeft);
      break;
  }

  return result;
}

async function checkHealth(hero) {
  logger.log(`checking health...`, { prefix: hero.prefix });
  try {
    let healthText = await getText(hero.page, xpath.HEALTH_XPATH);
    healthText = healthText.replaceAll(" ", "");
    const currentHealth = healthText.split("/")[0];
    const maxHealth = healthText.split("/")[1];
    logger.log(`health is [${currentHealth}/${maxHealth}]`, {
      prefix: hero.prefix,
      importance: 0,
    });

    if (currentHealth / maxHealth < 0.25) {
      await telegram.sendMessage(
        `${hero.ID}: health is LOW! ${currentHealth}/${maxHealth}, need to drink potion!`
      );
      logger.log(
        `health is too low! [${currentHealth}/${maxHealth}], telegram message sent`,
        {
          prefix: hero.prefix,
          importance: 1,
          messageModifiers: ["yellow"],
        }
      );
      logger.error(
        `waiting for 1 hour... need to restart the bot \ntodo: make drink health potion function`,
        {
          prefix: hero.prefix,
        }
      );
      await pause(SECOND * 3600);

      //todo: drink health potion
    }
  } catch (error) {
    logger.error(`error while checking health!\n${error}`, {
      prefix: hero.prefix,
    });
  }
}

async function getCurrentAnswerOptions(hero) {
  logger.log(`getting current answer options...`, {
    prefix: hero.prefix,
    importance: 0,
  });

  const answerOptionsElems = await getElems(
    hero.page,
    xpath.QUEST_ANSWER_XPATH
  );
  if (answerOptionsElems) {
    let answerOptions = [];
    for (let element of answerOptionsElems) {
      const text = (await puppeteer.elementInnerText(element))
        .replaceAll("\nChoose", "")
        .replaceAll("\nApprove", "");
      const buttonElement = await element.$('::-p-xpath("\\button")');
      answerOptions.push({ text: text, buttonElement: buttonElement });
    }
    logger.log(
      `${
        answerOptionsElems.length
      } answer options found on screen: [${answerOptions.map(
        (answer) => answer.text
      )}]`,
      {
        prefix: hero.prefix,
        importance: 0,
      }
    );
    return answerOptions;
  }
  logger.log(`no answer options found on screen!`, {
    prefix: hero.prefix,
    importance: 1,
    messageModifiers: ["yellow"],
  });
  return false;
}

async function compareAnswers(array1, array2) {
  if (array1 === array2) return true;
  logger.log("comparing answers...", { messageModifiers: ["yellow"] });
  if (!array1) {
    logger.log("array1 is empty or null", {
      messageModifiers: ["yellow", "bold"],
      importance: 0,
    });
    return false;
  }
  if (!array2) {
    logger.log("array2 is empty or null", {
      messageModifiers: ["yellow", "bold"],
      importance: 0,
    });
    return false;
  }
  if (array1.length !== array2.length) {
    logger.log(
      `array1's length[${array1.length}] is not equal to array2's length[${array2.length}]`,
      {
        messageModifiers: ["yellow", "bold"],
        importance: 0,
      }
    );
    return false;
  }
  array1.sort();
  array2.sort();

  for (let i = 0; i < array1.length; ++i) {
    if (array1[i] !== array2[i]) {
      logger.log(
        `arrays are not equal:
        \n\t[${array1}]\n\t[${array2}]`,
        {
          messageModifiers: ["yellow", "bold"],
          importance: 0,
        }
      );
      return false;
    }
  }
  return true;
}

async function clickAnswerButton(hero, answerObj) {
  //if text contains double quotes as first and last charecter concat is needed
  //because of the way page.waitForSelector parses xpath (id add's escape
  //symbols before every double quote, every!)
  const text = answerObj.text;
  const buttonElem = answerObj.buttonElement;

  let xpathToButton = `no xpath specified`;
  if (!text.includes("'"))
    xpathToButton = `//*[text()='${text}']/ancestor::div[contains(@class, "answer ")]/button`;
  else if (text[0] === '"' && text[text.length - 1] === '"')
    xpathToButton = `//*[text()=concat('"', ${text}, '"')]/ancestor::div[contains(@class, "answer ")]/button`;
  else
    xpathToButton = `//*[text()="${text}"]/ancestor::div[contains(@class, "answer ")]/button`;
  let success = await puppeteer.clickByPage(
    hero.page,
    xpathToButton,
    1000,
    false
  );
  if (!success) await buttonElem.click();
}

async function answerQuest(hero) {
  logger.log(`answering quest...`, { prefix: hero.prefix, importance: 0 });
  quests = await readJson(questsPath);

  const questTitle = await getText(hero.page, xpath.QUEST_TITLE_XPATH);
  if (!questTitle) {
    await saveBodyOfPage(hero.page, `${hero.prefix}_NoQuestTitle`);
    await throwQuestsError("noQuestTitleOrElement", hero);
    return;
  }
  const storyText = (
    await getText(hero.page, xpath.QUEST_TEXT_XPATH)
  ).replaceAll("\n", "");
  logger.log(
    `quest title: ${questTitle}, quest text: ${storyText.substring(0, 25)}...`,
    {
      prefix: hero.prefix,
      importance: 0,
    }
  );

  const currentAnswerOptions = await getCurrentAnswerOptions(hero);

  //if only one answer option found, answer with it
  if (currentAnswerOptions && currentAnswerOptions.length === 1) {
    logger.log(`only one answer option found, answering with it`, {
      prefix: hero.prefix,
      importance: 0,
    });
    await clickAnswerButton(hero, currentAnswerOptions[0]);
    return;
  }

  //temp; todo: at lvl 7 put on closthes, if don't have a weapon, go and buy one
  if (questTitle === "Guardian of the Forest") {
    await telegram.sendMessage(`${hero.prefix} is at Guardian of the Forest`);
    return;
  }

  //search quests.json for quest title and for quest text
  const storedQuest = quests[questTitle];
  if (!storedQuest) {
    await throwQuestsError(
      "noStoredQuest",
      hero,
      questTitle,
      storyText,
      currentAnswerOptions.map((obj) => obj.text)
    );
    return;
  }

  const storedStory = storedQuest[storyText];
  if (!storedStory) {
    await throwQuestsError(
      "noStoredStory",
      hero,
      questTitle,
      storyText,
      currentAnswerOptions.map((obj) => obj.text)
    );
    return;
  }

  const storedAnswerOptions = storedStory.answerOptions;
  if (!storedAnswerOptions) {
    await throwQuestsError(
      "noStoredAnswerOptions",
      hero,
      questTitle,
      storyText,
      currentAnswerOptions.map((obj) => obj.text)
    );
    return;
  }

  const areAnswerOptionsEqual = await compareAnswers(
    storedAnswerOptions,
    currentAnswerOptions.map((obj) => obj.text)
  );
  if (!areAnswerOptionsEqual) {
    await throwQuestsError(
      "answerOptionsNotEqual",
      hero,
      questTitle,
      storyText,
      currentAnswerOptions.map((obj) => obj.text),
      storedAnswerOptions
    );
    return;
  }

  const correctAnswer = storedStory.correctAnswer;
  if (!correctAnswer) {
    await throwQuestsError(
      "noCorrectAnswer",
      hero,
      questTitle,
      storyText,
      currentAnswerOptions.map((obj) => obj.text),
      storedAnswerOptions
    );
    return;
  }

  logger.log(`answering with correct answer [${correctAnswer}]`, {
    prefix: hero.prefix,
    importance: 0,
  });
  for (let option of currentAnswerOptions) {
    if (option.text === correctAnswer) {
      await clickAnswerButton(hero, option);
    }
  }
}

async function throwQuestsError(
  type,
  hero,
  questTitle = "",
  storyText = "",
  currentAnswerOptions = [],
  storedAnswerOptions = []
) {
  const pauseTime = SECOND * 60;
  let errorMessage = "";
  let telegramMessage = "";
  let partOfStoryText = "";

  switch (type) {
    case "noQuestTitleOrElement":
      telegramMessage = `*__${hero.prefix}: Failed to find quest element or title on page!__*`;
      errorMessage = `failed to find quest element or title on page! saving page as '${hero.prefix}_NoQuestTitle'`;
      break;
    case "noStoredQuest":
      telegramMessage = `*__${hero.prefix}: Quest not found__*\n\`[${questTitle}]\``;
      errorMessage = `quest not found - [${questTitle}]`;
      quests[questTitle] = {
        [storyText]: { answerOptions: currentAnswerOptions, correctAnswer: "" },
      };
      await writeJson(questsPath, quests);
      break;
    case "noStoredStory":
      telegramMessage = `*__${hero.prefix}: Story not found in quests.json for__*\n\`[${questTitle} -> ${storyText}]\``;
      errorMessage = `story not found in quests.json for quest title: [${questTitle}], story text: [${storyText}]`;
      quests[questTitle][storyText] = {
        answerOptions: currentAnswerOptions,
        correctAnswer: "",
      };
      await writeJson(questsPath, quests);
      break;
    case "noStoredAnswerOptions":
      partOfStoryText = `${storyText.substring(0, 25)}...`;
      telegramMessage = `*__${hero.prefix}: No stored answer options for__*\n\`[${questTitle}] -> [${partOfStoryText}]\``;
      errorMessage = `no stored answer options for quest!\n\t\tQUEST [${questTitle}]\n\t\tSTORY [${partOfStoryText}]`;
      quests[questTitle][storyText] = {
        answerOptions: currentAnswerOptions,
        correctAnswer: "",
      };
      await writeJson(questsPath, quests);
      break;
    case "answerOptionsNotEqual":
      partOfStoryText = `${storyText.substring(0, 25)}...`;
      telegramMessage = `*__${hero.prefix}: Answer options are not equal__*\n\`[${questTitle}] -> [${partOfStoryText}]\`\n*_storedAnswerOptions_*: [${storedAnswerOptions}]\n*_currentAnswerOptions_*: [${currentAnswerOptions}]`;
      errorMessage = `answer options are not equal!`;
      break;
    case "noCorrectAnswer":
      partOfStoryText = `${storyText.substring(0, 25)}...`;
      telegramMessage = `*__${hero.prefix}: No correct answer for__*\n\`[${questTitle}] -> [${partOfStoryText}]\``;
      errorMessage = `No correct answer for quest title: [${questTitle}]\nstory text: [${storyText}] `;
      break;
  }

  await telegram.sendMessage(telegramMessage);
  logger.error(errorMessage, { prefix: hero.prefix });
  logger.error(`pausing for ${pauseTime / 1000} seconds...`, {
    prefix: hero.prefix,
  });
  await pause(pauseTime);
  return;
}

//if JSON object of scene have 'actionTargets' key, then find target and click it,
//else wait for second.
async function takeAction(hero, currentScene) {
  if (!currentScene) return;

  switch (currentScene) {
    case "emptySreen":
    case "error":
      await refresh(hero.page);
      return;
    case "home":
      config.HEROES[hero.ID].currentLevel = await getCurrentLevel(hero);
      config = await updateJson(configPath, config);

      if (config.ALLOW_LEVEL_UP && (await isNextLevel(hero))) {
        // temp stop at level 4, go virtual till 7
        if (
          config.HEROES[hero.ID].currentLevel <= 4 ||
          (config.HEROES[hero.ID].currentLevel >= 7 &&
            config.HEROES[hero.ID].currentLevel < 12)
        ) {
          await levelUp(hero);
        }

        // todo: add logic to distribute stats according to build
        if (config.ALLOW_LEVEL_UP && config.HEROES[hero.ID].currentLevel > 12) {
          config.ALLOW_LEVEL_UP = false;
          config = await updateJson(configPath, config);
        }
      }

      //temp; todo: put on items, if don't have a weapon, go and buy one
      if (config.HEROES[hero.ID].currentLevel === 7) {
        await telegram.sendMessage(`${hero.prefix} is ready for boss fight!`);
        return;
      }

      logger.log(
        `${
          hero.sessionMaxDuration -
          (Date.now() - hero.sessionStartTime) / (1000 * 60)
        } minutes left, level: ${config.HEROES[hero.ID].currentLevel}/${
          config.HEROES[hero.ID].targetLevel
        }`,
        {
          prefix: hero.prefix,
          importance: 0,
          messageModifiers: ["italic", "magentaBright"],
        }
      );

      break;
    case "adventureCongratulations":
      if (
        Date.now() - config.HEROES[hero.ID].lastCompletedDungeonTimestamp >
        120 * 1000
      ) {
        logger.log(`adventure is finished`);
        config.HEROES[hero.ID].dungeonsCompleted++;
        config.HEROES[hero.ID].lastCompletedDungeonTimestamp = Date.now();
        config = await updateJson(configPath, config);
      }
      break;
    case "attacking":
    case "transactionProcessing":
    case "loading":
    case "questWaitingForTransacrion":
    case "questLoading":
      return;
    case "fight":
      await checkHealth(hero);
      break;
    case "quest":
      await answerQuest(hero);
      return;
  }

  let targets = scenes[currentScene].actionTargets
    ? scenes[currentScene].actionTargets
    : false;

  if (targets) {
    logger.log(`found ${Object.keys(targets).length} targets for action`, {
      prefix: hero.prefix,
      importance: 0,
    });
    for (let target in targets) {
      let targetElement = await puppeteer.xPathExist(
        hero.page,
        targets[target].xpath
      );

      //the time between last action and now
      let currentTimeGap = Date.now() - hero.lastActionTime;
      if (targetElement) {
        if (currentTimeGap > config.MIN_TIME_GAP_BETWEEN_ACTIONS) {
          logger.log(`clicking on [${target}] target`, {
            prefix: hero.prefix,
            importance: 0,
          });
          await puppeteer.clickByPage(hero.page, targets[target].xpath);
          hero.idleCount = 0;
          hero.lastActionTime = Date.now();
        } else {
          logger.log(
            `Too fast! ${currentTimeGap}/${config.MIN_TIME_GAP_BETWEEN_ACTIONS} ms passed since last action.`,
            { prefix: hero.prefix, importance: 1 }
          );
        }
      } else {
        logger.log(`target is not there!`, {
          prefix: hero.prefix,
          importance: 0,
        });
      }
    }
  } else {
    hero.idleCount++;
    logger.log(
      `no action targets for ${currentScene} scene! idle count: ${hero.idleCount}/${config.IDLE_COUNT_MAX}`,
      {
        prefix: hero.prefix,
        importance: 1,
      }
    );
    if (hero.idleCount >= config.IDLE_COUNT_MAX) {
      await saveBodyOfPage(hero.page, `${hero.ID}_idle_${currentScene}`);
      await telegram.sendMessage(
        `${hero.ID} is too idle! Waiting for 2 minutes...`
      );
      logger.error(
        `is too idle at ${currentScene} scene! telergam message sent, pausing for 2 minutes...`,
        {
          prefix: hero.prefix,
        }
      );
      await pause(SECOND);
    }
    await pause(SECOND);
  }
}

async function play(currentHeroes) {
  //todo: check if heroes are not at target level
  let isPlaying = true;

  while (isPlaying) {
    for await (let hero of currentHeroes) {
      if (currentHeroes.length === 0) {
        logger.log(`\n\t~= ALL HEROES ARE DONE =~\n`, {
          messageModifiers: ["green", "underline"],
        });
        isPlaying = false;
        break;
      }

      //if hero is out of time, remove it from the array
      if (await isOutOfTime(hero)) {
        logger.log(`is out of time!`, {
          prefix: hero.prefix,
        });

        currentHeroes.pop(hero);

        logger.log(`is removed from the [currentHeroes]`, {
          prefix: hero.prefix,
          importance: 0,
        });

        continue;
      }

      if (
        config.MODE === "level" &&
        config.HEROES[hero.ID].currentLevel >=
          config.HEROES[hero.ID].targetLevel
      ) {
        config.HEROES[hero.ID].active = false;
        config = await updateJson(configPath, config);

        logger.log(`is done with levelling!`, {
          messageModifiers: ["green"],
          prefix: hero.prefix,
        });

        currentHeroes.pop(hero);
        continue;
      }

      if (
        config.MODE === "daily" &&
        config.HEROES[hero.ID].dungeonsCompleted >= 3
      ) {
        logger.log(`is done with dungeons!`, {
          messageModifiers: ["green"],
          prefix: hero.prefix,
        });

        // let rewardClaimed = await getDailyReward(hero);
        // if (rewardClaimed) currentHeroes.pop(hero);

        config.HEROES[hero.ID].active = false;
        config = await updateJson(configPath, config);

        currentHeroes.pop(hero);

        continue;
      }

      let currentScene = await getCurrentScene(hero);
      logger.log(`current scene: ${currentScene}`, {
        prefix: hero.prefix,
      });
      //test
      return;
      await takeAction(hero, currentScene);
    }
  }
}

async function getHeroName(hero) {
  return await getText(hero.page, xpath.HERO_NAME_XPATH);
}

//todo: add to xpath.DAILY_CHEST and xpath.WEEKLY_CHEST '... and not (//xpath-to-daily/weakly-reward)]'
async function getDailyReward(hero) {
  logger.log(`getting daily reward...`, {
    prefix: hero.prefix,
    importance: 0,
  });
  await hero.page.goto("https://sonic.sacra.game/daily-quests", {
    waitUntil: "networkidle0",
  });

  // //div[contains(@class, "quest__count")]
  let completedQuestsText = await getText(
    hero.page,
    '//div[contains(@class, "quest__count")]'
  );
  let requiredCompletedDungeons = completedQuestsText.split("/")[1];
  let completedDungeons = completedQuestsText.split("/")[0];

  if (completedDungeons < requiredCompletedDungeons) {
    logger.log(
      `completed dungeons: ${completedDungeons} < required: ${requiredCompletedDungeons}`,
      {
        prefix: hero.prefix,
        messageModifiers: ["yellowBright"],
        prefixModifiers: ["yellowBright"],
      }
    );
    config.HEROES[hero.ID].dungeonsCompleted = completedDungeons;
    config = await updateJson(configPath, config);
    return false;
  }

  //number of daily rewards
  while ((await getText(hero.page, xpath.DAILY_REWARD_COUNT))[1] > 0) {
    await puppeteer.clickByPage(hero.page, xpath.DAILY_CHEST, 5000);
    await hero.page.waitForNetworkIdle({ idleTime: 5000 });
    await puppeteer.clickByPage(hero.page, xpath.DAILY_REWARD, 5000);
    await hero.page.waitForNetworkIdle({ idleTime: 5000 });
    logger.log(`daily reward received`, {
      prefix: hero.prefix,
      importance: 1,
      messageModifiers: ["whiteBright"],
    });
  }

  //number of weekly rewards
  while ((await getText(hero.page, xpath.WEAKLY_REWARD_COUNT))[1] > 0) {
    await puppeteer.clickByPage(hero.page, xpath.WEAKLY_CHEST, 5000);
    await hero.page.waitForNetworkIdle({ idleTime: 5000 });
    await puppeteer.clickByPage(hero.page, xpath.WEAKLY_REWARD, 5000);
    await hero.page.waitForNetworkIdle({ idleTime: 5000 });
    logger.log(`weakly reward received`, {
      prefix: hero.prefix,
      importance: 1,
      messageModifiers: ["yellowBright"],
    });
  }

  logger.log(`done with rewards`, {
    prefix: hero.prefix,
    importance: 1,
    messageModifiers: ["greenBright", "underline", "bold"],
  });

  return true;
}

async function levelUp(hero) {
  logger.log(`levelling up to ${config.HEROES[hero.ID].currentLevel}...`, {
    prefix: hero.prefix,
    importance: 0,
  });

  //temp, todo: add logic for selecting correct attribute
  let xpathAttr;
  switch (config.HEROES[hero.ID].currentLevel) {
    case 2:
      xpathAttr = xpath.LEVEL_UP_PLUS_VIT;
      break;
    case 3:
      xpathAttr = xpath.LEVEL_UP_PLUS_DEX;
      break;
    case 4:
      xpathAttr = xpath.LEVEL_UP_PLUS_DEX;
      break;
    case 7:
      xpathAttr = xpath.LEVEL_UP_PLUS_DEX;
      break;
    case 8:
      xpathAttr = xpath.LEVEL_UP_PLUS_STR;
      break;
    case 9:
      xpathAttr = xpath.LEVEL_UP_PLUS_STR;
      break;
    case 10:
      xpathAttr = xpath.LEVEL_UP_PLUS_STR;
      break;
    case 11:
      xpathAttr = xpath.LEVEL_UP_PLUS_VIT;
      break;
    default:
      logger.log(
        `can't level up on level [${config.HEROES[hero.ID].currentLevel}]!`,
        { prefix: hero.prefix }
      );
      return;
  }

  await puppeteer.clickByPage(hero.page, xpath.LEVEL_UP_BUTTON);
  await hero.page.waitForNetworkIdle({ idleTime: 2000 });
  while ((await getText(hero.page, xpath.LEVEL_UP_AVAILABLE_STATS)) > 0) {
    await puppeteer.clickByPage(hero.page, xpathAttr);
    await pause(SECOND / 5);
  }
  await puppeteer.clickByPage(hero.page, xpath.LEVEL_UP_BUTTON_CONFIRM);
  await pause(SECOND);
}

async function isNextLevel(hero) {
  if (
    ((await getElem(hero.page, xpath.LEVEL_UP_NOTIFICATION_ICON, 500)) ||
      (await getElem(hero.page, xpath.LEVEL_UP_TO, 500))) &&
    !(await getElem(hero.page, xpath.CONTINUE_ADVENTURE_BUTTON, 500))
  ) {
    logger.log(`is ready to level up`, {
      prefix: hero.prefix,
    });
    return true;
  }
  return false;
}

async function getCurrentLevel(hero) {
  //selects all digits in string
  const regex = RegExp("\\d+", "g");
  const levelUpToText = await getText(hero.page, xpath.LEVEL_UP_TO, {
    logError: false,
  });
  const digit = regex.exec(levelUpToText);
  if (digit) {
    return parseInt(digit[0]);
  }
  return await getText(hero.page, xpath.LEVEL);
}

async function init() {
  quests = await readJson(questsPath);
  config = await readJson(configPath);
  if (specifiedMode) {
    config.MODE = specifiedMode;
    config = await updateJson(configPath, config);
  }
}

class Hero {
  ID;
  name;
  prefix;
  homeURL;
  dungeonsCompleted = 0;
  dungeonCounterTimestamp = 0;
  page;
  sessionStartTime;
  sessionMaxDuration;
  idleCount = 0;
  lastActionTime = 0;
  constructor(ID, name, homeURL, sessionMaxDuration) {
    this.ID = ID;
    this.name = name;
    this.homeURL = homeURL;
    this.sessionMaxDuration = sessionMaxDuration;
    this.sessionStartTime = Date.now();
  }
}

(async () => {
  await init();

  quests = await readJson(questsPath);
  config = await readJson(configPath);
  let heroesToLaunch = config.HEROES;

  // const jsonsToWatch = [questsPath, configPath];
  // await watchJsonChanges(jsonsToWatch);

  logger.log(`\n\nMODE: ${config.MODE}\nLOG_LEVEL: ${config.LOG_LEVEL}`, {
    timestampPresence: false,
    prefixPresence: false,
    messageModifiers: ["whiteBright", "underline", "bold"],
  });

  const browsers = await getBrowsers(await getIDs());
  let currentHeroes = [];
  let openPages = [];
  for (const browser of browsers) {
    if (!browser) {
      logger.error("Failed to initiate browser");
      return;
    }

    // await logInRabbyWallet(browser);
    // await setListenerForNewPageCreated(browser);

    openPages.push(...(await browser.pages()));
  }

  for (let heroIndex in heroesToLaunch) {
    if (!heroesToLaunch[heroIndex].active) continue;

    const hero = new Hero(
      heroesToLaunch[heroIndex].heroID,
      heroesToLaunch[heroIndex].heroName,
      `${config.BASE_URL}${heroesToLaunch[heroIndex].classContractAddress}/${heroesToLaunch[heroIndex].heroID}`,
      heroesToLaunch[heroIndex].sessionMaxDurationInMinutes
    );

    //check if one of the pages contains ID of the hero
    for (let page of openPages) {
      const url = await page.url();
      if (!url.includes("sonic.sacra.game")) {
        continue;
      }

      if (url.includes(`/${hero.ID}`)) {
        hero.page = page;
        hero.name = await getHeroName(hero);
        logger.log(`found existing page for hero |${hero.name}[${hero.ID}]|`);
        break;
      }
    }

    // create new page for hero
    if (!hero.page) {
      page = await browser.newPage();
      await goToHomePage(hero);
      hero.page = page;
      hero.name = await getHeroName(hero);
      logger.log(`opened new page for hero |${hero.name}[${hero.ID}]|`);
    }

    //04:42:10 samwise[443] some-line-of-text
    hero.prefix = `(${heroesToLaunch[hero.ID].browser_id})${hero.name}[${
      hero.ID
    }]`;
    currentHeroes.push(hero);
  }

  if (!Object.values(MODE).includes(config.MODE)) {
    logger.error(`unknown mode: ${config.MODE}`);
    return;
  }

  await play(currentHeroes);
  return;
})();
