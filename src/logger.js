const { styleText } = require("node:util");
const configLogLevel = resolveConfigLevel(
  require("../configs/config.json").LOG_LEVEL
);
console.log("configLogLevel: ", configLogLevel);
const DateFormat = require("date-format");
const exp = require("node:constants");

//prefix: function() { return get hero in for loop }?
let defaultOptions = {
  timestampPresence: true,
  timestampFormat: "hh:mm:ss",
  timestampModifiers: ["blueBright"],
  prefixPresence: true,
  prefix: "",
  prefixModifiers: ["blueBright"],
  messageModifiers: ["whiteBright"],
  importance: 1,
};

function setDefaultOptions(options) {
  for (let key in options) {
    if (options[key] !== undefined && defaultOptions[key] !== undefined) {
      defaultOptions[key] = options[key];
    }
  }
}

/**
 * @param { 0 | 1 } importance - 1: message will always be printed | 0: message will be printed only if config.LOG_LEVEL is (2, 'full', 'FULL')
 * @param { [] } modifiers - array of strings, such as
 *    ["bold", "underline", "italic", "blink", "strikethrough", "overline", "dim",
 *     "hidden", "inverse", "framed", "inverse"]
 */
function log(
  message,
  {
    timestampPresence = defaultOptions.timestampPresence,
    timestampFormat = defaultOptions.timestampFormat,
    timestampModifiers = defaultOptions.timestampModifiers,
    prefixPresence = defaultOptions.prefixPresence,
    prefix = defaultOptions.prefix,
    prefixModifiers = defaultOptions.prefixModifiers,
    messageModifiers = defaultOptions.messageModifiers,
    importance = defaultOptions.importance,
  } = {}
) {
  if (configLogLevel === 0) return;
  if (configLogLevel === 2 || importance === configLogLevel) {
    const timeStamp = timestampPresence
      ? styleText(timestampModifiers, getTimestamp(timestampFormat) + " ")
      : "";

    const prefixText = prefixPresence ? styleText(prefixModifiers, prefix) : "";

    message = styleText(messageModifiers, ` ${message}`);
    console.log(timeStamp + prefixText + message);
  }
}

function error(
  message,
  {
    timestampPresence = defaultOptions.timestampPresence,
    timestampFormat = defaultOptions.timestampFormat,
    timestampModifiers = defaultOptions.timestampModifiers.concat("italic"),
    prefixPresence = defaultOptions.prefixPresence,
    prefix = defaultOptions.prefix,
    prefixModifiers = defaultOptions.prefixModifiers.concat("italic"),
    messageModifiers = ["red"],
    importance = defaultOptions.importance,
  } = {}
) {
  log(message, {
    timestampPresence,
    timestampFormat,
    timestampModifiers,
    prefixPresence,
    prefix,
    prefixModifiers,
    messageModifiers,
    importance,
  });
}

function resolveConfigLevel(configLogLevel) {
  if (configLogLevel === undefined) {
    return 2;
  } else if (!configLogLevel) {
    return 0;
  }

  if (typeof configLogLevel === "number") {
    if (configLogLevel !== 0 || configLogLevel !== 1) {
      return 2;
    }
    return configLogLevel;
  }

  if (typeof configLogLevel === "string") {
    if (
      configLogLevel.toLowerCase() === "full" ||
      configLogLevel.toLowerCase() === "deep" ||
      configLogLevel.toLowerCase() === "two"
    ) {
      return 2;
    } else if (
      configLogLevel.toLowerCase() === "partial" ||
      configLogLevel.toLowerCase() === "info" ||
      configLogLevel.toLowerCase() === "one"
    ) {
      return 1;
    } else if (
      configLogLevel.toLowerCase() === "none" ||
      configLogLevel.toLowerCase() === "zero"
    ) {
      return 0;
    }
  }

  return 2;
}

function getTimestamp(format) {
  return DateFormat.asString(format, new Date());
}

exports.log = log;
exports.error = error;
exports.setDefaultOptions = setDefaultOptions;
