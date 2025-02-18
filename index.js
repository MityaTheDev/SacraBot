const logger = require("./src/logger.js");
const Ads = require("./src/AdsPower/index");
const puppeteer = require(`./src/BrowserAutomation/puppeteer.js`);
const { pause, SECOND } = require("./src/time.js");
const PptrCfg = require("./configs/puppeteer.json");
const config = require("./configs/config.json");
const xpath = require("./xpath/xpath.json");
const telegram = require("./src/telegram.js");
const gameConfig = require("./configs/game_config.json");
const scenes = require("./DATA/scenes.json");
const fs = require("fs/promises");
const DateFormat = require("date-format");
let quests = require("./DATA/quests.json");

async function isTimeLeft(hero) {
  return new Promise((resolve, reject) => {
    const currentTime = Date.now();
    const minutesLeft =
      hero.sessionMaxDuration -
      (currentTime - hero.sessionStartTime) / (1000 * 60);
    if (minutesLeft <= 0) {
      resolve(false);
    }
    resolve(true);
  });
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

async function getBrowser() {
  let browserStatusBySN = await Ads.browserStatusBySN(config.BROWSER_ID);
  let isBroswerActive =
    browserStatusBySN && browserStatusBySN.status === "Active" ? true : false;
  await pause(SECOND * 3);
  while (!isBroswerActive) {
    logger.error("Browser is not active");
    logger.error("BrowserStatusBySN: " + browserStatusBySN);
    if (browserStatusBySN)
      logger.error("BrowserStatusBySN.status: " + browserStatusBySN.status);
    await Ads.browserOpenBySN(config.BROWSER_ID);
    browserStatusBySN = await Ads.browserStatusBySN(config.BROWSER_ID);
    isBroswerActive =
      browserStatusBySN && browserStatusBySN.status === "Active" ? true : false;
    await pause(SECOND * 3);
  }

  const BOT = {};
  BOT._id = config.BROWSER_ID;
  PptrCfg.browserWSEndpoint = browserStatusBySN.ws.puppeteer;
  await puppeteer.CreateBrowser(BOT, PptrCfg);
  return await BOT.browser;
}

async function getElem(page, xpath, timeout = 1) {
  try {
    await page.waitForSelector("::-p-xpath(" + xpath + ")", {
      timeout: timeout,
    });
    return await page.$("::-p-xpath(" + xpath + ")");
  } catch (error) {
    logger.error(error);
    return false;
  }
}

async function getElems(page, xpath, timeout = 1) {
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

//todo: add multiple option, return page.$$eval() (find out what it returns)
/**
 * @param {'innerText' | 'textContent'} option
 */
async function getText(page, xpath, timeout = 1, option = "innerText") {
  if (option !== "innerText" && option !== "textContent") {
    throw new Error(
      `'option' parameter in getText() must be 'innerText' or 'textContent' (innerText is default); currently it's '${option}'`
    );
  }

  try {
    await page.waitForSelector("::-p-xpath(" + xpath + ")", {
      timeout: timeout,
    });
    const text = await page.$eval(
      "::-p-xpath(" + xpath + ")",
      (elem) => elem.innerText
    );
    return text;
  } catch (error) {
    logger.error(error);
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
    let xpath = scenes[scene].indicator.xpath;
    let description = scenes[scene].indicator.description;

    if (await puppeteer.xPathExist(hero.page, xpath)) {
      result.push(scene);
      //transactionProcessing scene is special. It is detected by xpath that
      // is an element over the page with some other scene. We could add to almost
      // EVERY scene indicator's xpath '... and not(//*some_specific_element*)'
      // but for the sake of saving time of the author, we just break the loop.
      // Important that this scene is the first in scenes object.
      if (scene === "transactionProcessing" || scene === "error") break;
    }
  }

  if (result.length === 1) {
    return result[0];
  } else if (result.length === 0) {
    logger.log(
      `no scene found, trying again... iterations left: [${iterationsLeft}]`,
      { prefix: hero.prefix, importance: 0, messageModifiers: ["yellow"] }
    );
    await pause(SECOND * 2);
    result = await getCurrentScene(hero, --iterationsLeft);
  } else if (result.length > 1) {
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
  } else {
    logger.log(`retrying... iterations left: [${iterationsLeft}]`, {
      prefix: hero.prefix,
      importance: 0,
      messageModifiers: ["yellow"],
    });
    return await getCurrentScene(hero, --iterationsLeft);
  }
}

async function checkHealth(hero) {
  logger.log(`checking health...`, { prefix: hero.prefix });
  try {
    let healthElem = await getElem(hero.page, xpath.HEALTH_XPATH, 10000);
    let healthText = await puppeteer.elementInnerText(hero.page, healthElem);
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
    xpath.QUEST_ANSWER_XPATH,
    3000
  );
  if (answerOptionsElems) {
    let answerOptions = [];
    for (let element of answerOptionsElems) {
      const text = (await puppeteer.elementInnerText(element)).replaceAll(
        "\n",
        ""
      );
      answerOptions.push(text);
    }
    logger.log(
      `${answerOptionsElems.length} answer options found on screen: [${answerOptions}]`,
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

async function clickAnswerButton(hero, text) {
  //DOUBLE QUOTES AROUND ${text} ARE NEEDED HERE!
  //THERE ARE SINGLE QUOTES IN SOME ANSWER TEXT!
  let xpathToButton = `//*[text()="${text}"]/ancestor::div[contains(@class, "answer ")]/button`;
  //if text contains double quotes as first and last charecter concat is needed
  //because of the way page.waitForSelector parses xpath (id add's escape
  //symbols before every double quote, every!)
  if (text[0] === '"' && text[text.length - 1] === '"') {
    xpathToButton = `//*[text()=concat('"', ${text}, '"')]/ancestor::div[contains(@class, "answer ")]/button`;
  }
  let buttonCorrectAnswer = await getElem(hero.page, xpathToButton, 1000);
  if (buttonCorrectAnswer) {
    await puppeteer.clickByPage(hero.page, xpathToButton);
  } else {
    throw new Error(`${hero.ID}: correct answer button not found!`);
  }
}

async function answerQuest(hero) {
  logger.log(`answering quest...`, { prefix: hero.prefix, importance: 0 });
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

  const questElem = await getElem(hero.page, xpath.QUEST_TITLE_XPATH, 1000);
  const questTitle = await puppeteer.elementInnerText(hero.page, questElem);
  if (questElem && questTitle) {
    const questTextElem = await getElem(
      hero.page,
      xpath.QUEST_TEXT_XPATH,
      1000
    );
    const storyText = (
      await puppeteer.elementInnerText(hero.page, questTextElem)
    ).replaceAll("\n", "");
    logger.log(
      `quest title: ${questTitle}, quest text: ${storyText.substring(
        0,
        25
      )}...`,
      {
        prefix: hero.prefix,
        importance: 0,
      }
    );
    //search quests.json for quest title and for quest text
    const storedQuests = quests[questTitle];
    if (storedQuests) {
      const currentStory = storedQuests[storyText];
      if (!currentStory) {
        await telegram.sendMessage(
          `${hero.prefix}: no story found in quests.json for quest title: ${questTitle}\nquest text: ${storyText}`
        );
        logger.error(
          `no story found in quests.json for quest title: [${questTitle}], story text: [${storyText}]`,
          { prefix: hero.prefix }
        );
        await pause(SECOND * 60 * 2);
        quests = require("./DATA/quests.json");
        return;
      }
      let storedAnswerOptions = currentStory.answerOptions;
      if (storedAnswerOptions) {
        const areAnswersEqual = await compareAnswers(
          storedAnswerOptions,
          currentAnswerOptions
        );
        if (areAnswersEqual) {
          logger.log(
            `answering with correct answer [${currentStory.correctAnswer}]`,
            {
              prefix: hero.prefix,
              importance: 0,
            }
          );
          await clickAnswerButton(hero, currentStory.correctAnswer);
        } else {
          await telegram.sendMessage(
            `*__${
              hero.prefix
            }: Answer options are not equal__*\n\`[${questTitle}] -> [${storyText.substring(
              0,
              25
            )}...]\`\n*_storedAnswerOptions_*: [${storedAnswerOptions}]\n*_currentAnswerOptions_*: [${currentAnswerOptions}]`
          );
          logger.error(
            `answer options are not equal! sent telegram message, pausing for 2 minutes...`,
            {
              prefix: hero.prefix,
            }
          );
          await pause(SECOND * 60 * 2);
          return;
        }
      } else {
        await telegram.sendMessage(
          `${
            hero.prefix
          }: no stored answer options for quest [${questTitle}]\nstory [${storyText.substring(
            0,
            25
          )}...]`
        );
        logger.error(
          `no stored answer options for quest!\n\t\tQUEST [${questTitle}]\n\t\tSTORY [${storyText.substring(
            0,
            25
          )}...]\ntelegram message sent, pausing for 2 minutes...`,
          { prefix: hero.prefix }
        );
        await pause(SECOND * 60 * 2);
        return;
      }
    } else {
      await telegram.sendMessage(
        `${hero.prefix}: no story found for quest: ${questTitle}`
      );
      logger.error(
        `no story found for QUEST [${questTitle}], pausing for 2 minutes...`,
        { prefix: hero.prefix }
      );
      await pause(SECOND * 60 * 2);
      return;
    }
  } else {
    await telegram.sendMessage(
      `${hero.ID}: failed to find quest element or title!`
    );
    logger.error(
      `failed to find quest element or title! saving page as '${hero.prefix}_NoQuestTitle', pausing for 2 minutes...`,
      {
        prefix: hero.prefix,
      }
    );
    await saveBodyOfPage(hero.page, `${hero.prefix}_NoQuestTitle`);
    await pause(SECOND * 60 * 2);
    return;
  }
}

//if JSON object of scene have 'actionTargets' key, then find target and click it,
//else wait for second.
async function action(hero, currentScene) {
  switch (currentScene) {
    case "emptySreen":
    case "error":
      await refresh(hero.page);
      return;
    case "home":
      logger.log(
        `${
          hero.sessionMaxDuration -
          (Date.now() - hero.sessionStartTime) / (1000 * 60)
        } minutes left`,
        {
          prefix: hero.prefix,
          importance: 0,
          messageModifiers: ["italic", "magentaBright"],
        }
      );
      if (!hero.name) hero.name = await getHeroName(hero.page);
      break;
    case "adventureCongratulations":
      if (Date.now() - hero.dungeonCounterTimestamp > 120 * 1000) {
        hero.dungeonsCompleted++;
        hero.dungeonCounterTimestamp = Date.now();
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

  let targets = false;
  if (currentScene) targets = scenes[currentScene].actionTargets;

  if (targets) {
    logger.log(`found ${targets.length} targets`, {
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

async function playFirstBiome(heroes) {
  //todo: check if heroes are not at target level
  let isPlaying = true;

  while (isPlaying) {
    for (let hero of heroes) {
      //if hero is out of time, remove it from the array
      if (!(await isTimeLeft(hero))) {
        logger.log(`is out of time!`, {
          prefix: hero.prefix,
        });
        if (heroes.length === 1) {
          logger.log(`\n\t~= ALL HEROES ARE OUT OF TIME =~\n`, {
            messageModifiers: ["green", "underline"],
          });
          isPlaying = false;
          break;
        } else {
          heroes.pop(hero);
          logger.log(`is removed from the [heroes]`, {
            prefix: hero.prefix,
            importance: 0,
          });
        }
        continue;
      }

      if (config.MODE === "daily") {
        if (hero.dungeonsCompleted >= 3) {
          if (heroes.length === 1) {
            logger.log(`\n\t~= ALL HEROES ARE DONE WITH DAILIES =~\n`, {
              messageModifiers: ["green", "underline"],
            });
            isPlaying = false;
            break;
          } else {
            heroes.pop(hero);
            logger.log(`is removed from the [heroes]`, {
              prefix: hero.prefix,
              importance: 0,
            });
          }
          continue;
        }
      }

      let currentScene = await getCurrentScene(hero);
      logger.log(`current scene: ${currentScene}`, {
        prefix: hero.prefix,
      });
      await action(hero, currentScene);
      await pause(SECOND * 1);
    }
  }
}

async function getHeroName(hero) {
  return new Promise(async (resolve, reject) => {
    const heroName = await getText(hero.page, xpath.HERO_NAME_XPATH, 5000);
    resolve(heroName);
  });
}

// todo: make it work...
// can't access hero.page from evaluate()
// nor send it as parameter (comes as undefiened)
async function listenToQuest(heroes) {
  let isPlaying = true;

  const iterationLimit = 1000;
  let i = 0;
  // while (isPlaying) {
  for (let hero of heroes) {
    let correctAnswerFromClick = "";
    let currentSceneWhileListeningToQuests = await getCurrentScene(hero);
    const page = hero.page;
    await hero.page.evaluate(async (page) => {
      logger.log("Page: " + page);
      if (false === "quest") {
        const questElem = await getElem(
          hero.page,
          xpath.QUEST_TITLE_XPATH,
          1000
        );
        const questTitle = await puppeteer.elementInnerText(
          hero.page,
          questElem
        );
        if (questElem && questTitle) {
          const questTextElem = await getElem(
            hero.page,
            xpath.QUEST_TEXT_XPATH,
            1000
          );
          const questText = await puppeteer.elementInnerText(
            hero.page,
            questTextElem
          );

          if (!quests.hasOwnProperty(questTitle)) {
            quests[questTitle] = new Object();
            quests[questTitle][questText] = {
              answerOptions: testAnswerOptions,
              correctAnswer: correctAnswer,
            };
          } else if (!quests[questTitle].hasOwnProperty(questText)) {
            quests[questTitle][questText] = {
              answerOptions: testAnswerOptions,
              correctAnswer: correctAnswer,
            };
          } else {
            logger.log(`quest [${questTitle}] already exists!`, {
              prefix: hero.prefix,
              importance: 1,
            });
          }
        }

        document.addEventListener("click", (event) => {
          const clickedElement = event.target;
          const parentElement = clickedElement.parentElement;
          let correctAnswerFromClickElem = parentElement.querySelector(
            "div[class~='answer__text']"
          );
          if (correctAnswerFromClickElem) {
            let correctAnswerFromClick = correctAnswerFromClickElem.innerText;
            if (correctAnswerFromClick && !correctAnswerFromClick !== "") {
              quests[questTitle][questText]["correctAnswer"] =
                correctAnswerFromClick;
            }
          }
        });
      }
    });

    await hero.page.on("console", async (msg) => {
      if (msg.text().startsWith("object:")) {
        let recievedObject = msg.text().split(":")[1];
        logger.log(`recieved object from console: [${recievedObject}]`);
        const jsonfile = require("jsonfile");
        const file = "./DATA/quests.json";
        jsonfile.writeFileSync(file, quests, { flag: "a" });
        logger.log("quests saved");
      }
    });

    await pause(SECOND);
    return;
    quests = require("./DATA/quests.json");

    let currentScene = await getCurrentScene(hero);
    if (currentScene === "quest") {
      await pause(SECOND * 1);
    }
    logger.log(`\t~listening to quests~: ${i}/${iterationLimit}`);
    if (++i > iterationLimit) return;
  }
  // }
}

//todo: add to xpath.DAILY_CHEST and xpath.WEEKLY_CHEST '... and not (//xpath-to-daily/weakly-reward)]'
async function getDailyReward(page) {
  await page.goto("https://sonic.sacra.game/daily-quests", {
    waitUntil: "networkidle0",
  });

  //number of daily rewards
  while ((await getText(page, xpath.DAILY_REWARD_COUNT, 10000))[1] > 0) {
    await puppeteer.clickByPage(page, xpath.DAILY_CHEST, 5000);
    await page.waitForNetworkIdle({ idleTime: 5000 });
    await puppeteer.clickByPage(page, xpath.DAILY_REWARD, 5000);
    await page.waitForNetworkIdle({ idleTime: 5000 });
  }

  //number of weekly rewards
  while ((await getText(page, xpath.WEAKLY_REWARD_COUNT, 10000))[1] > 0) {
    await puppeteer.clickByPage(page, xpath.WEAKLY_CHEST, 5000);
    await page.waitForNetworkIdle({ idleTime: 5000 });
    await puppeteer.clickByPage(page, xpath.WEAKLY_REWARD, 5000);
    await page.waitForNetworkIdle({ idleTime: 5000 });
  }
}

(async () => {
  const browser = await getBrowser();
  if (!browser) {
    logger.error("Failed to initiate browser");
    return;
  }
  logger.log(`\n\nMODE: ${config.MODE}\nLOG_LEVEL: ${config.LOG_LEVEL}`, {
    timestampPresence: false,
    prefixPresence: false,
    messageModifiers: ["whiteBright", "underline", "bold"],
  });
  // await setListenerForNewPageCreated(browser);

  const openPages = await browser.pages();

  let heroes = [];
  const heroesCount = gameConfig.length;
  for (let i = 0; i < heroesCount; i++) {
    const hero = new Hero(
      gameConfig[i].heroID,
      config.BASE_URL + gameConfig[i].heroID,
      gameConfig[i].targetLevel,
      gameConfig[i].sessionMaxDurationInMinutes
    );

    //check if one of the pages contains ID of the hero
    for (let page of openPages) {
      const url = await page.url();
      if (!url.includes("sonic.sacra.game")) {
        continue;
      }

      if (url.includes(hero.ID)) {
        hero.page = page;
        hero.name = await getHeroName(hero);
        logger.log(`found existing page for hero |${hero.name}[${hero.ID}]|`);
        break;
      }
    }

    //create new page for hero
    if (!hero.page) {
      page = await browser.newPage();
      await goToHomePage(hero);
      hero.page = page;
      hero.name = await getHeroName(hero);
      logger.log(`opened new page for hero |${hero.name}[${hero.ID}]|`);
    }

    //04:42:10 samwise[443] some-line-of-text
    hero.prefix = `${hero.name}[${hero.ID}]`;
    heroes.push(hero);
  }

  switch (config.MODE) {
    case "level":
      await playFirstBiome(heroes);
      break;
    case "daily":
      await playFirstBiome(heroes);
      await getDailyReward(heroes[0].page);
      break;
    case "listen":
      logger.error(
        `"listen" MODE is not implemented yet. Select "level" or "daily" mode!`
      );
      return false;
    default:
      logger.error(`unknown mode: ${config.MODE}`);
      break;
  }
  // await playFirstBiome(heroes);
  // await listenToQuest(heroes);
})();

class Hero {
  ID;
  name;
  prefix;
  homeURL;
  targetLevel;
  dungeonsCompleted = 0;
  dungeonCounterTimestamp = 0;
  page;
  sessionStartTime;
  sessionMaxDuration;
  idleCount = 0;
  lastActionTime = 0;
  constructor(ID, homeURL, targetLevel, sessionMaxDuration) {
    this.ID = ID;
    this.homeURL = homeURL;
    this.targetLevel = targetLevel;
    this.sessionMaxDuration = sessionMaxDuration;
    this.sessionStartTime = Date.now();
  }
}
