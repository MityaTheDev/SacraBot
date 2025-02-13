/* ========================================================================= */
// Time
const pause = async (ms) => await new Promise(r=>setTimeout(r, ms));
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const YEAR = DAY * 365;
const LEAP_YEAR = DAY * 366;
const dateNowLocalTimeString = (locales,  options) => new Date(
  Date.now()).toLocaleTimeString(locales,  options);
const dateNowLocaleString = (locales,  options) => new Date(
  Date.now()).toLocaleString(locales,  options);

/* ========================================================================= */
// Time export
exports.pause = pause;
exports.SECOND = SECOND;
exports.MINUTE = MINUTE;
exports.HOUR = HOUR;
exports.DAY = DAY;
exports.WEEK = WEEK;
exports.YEAR = YEAR;
exports.LEAP_YEAR = LEAP_YEAR;
exports.dateNowLocalTimeString = dateNowLocalTimeString;
exports.dateNowLocaleString = dateNowLocaleString;

/* ========================================================================= */
// const {time} = require('./index');

// ;(
//   async () => {
//     console.log(time.dateNowLocaleString(`ru-RU`))
//     await time.pause(time.SECOND * 5);
//     console.log(time.dateNowLocaleString(`en-US`), `end`)
//     // 21.11.2024, 17:04:16
//     // 11/21/2024, 5:04:21 PM end
//   }
// )();