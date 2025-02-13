/* ========================================================================= */
function randomBetweenInt(min, max){
  // console.log(min, max)
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max + 1 - min) + min); 
};

/* ========================================================================= */
function randomBetweenFloat(min, max, fixed){
  fixed = (fixed) ? fixed : 3;
  min = parseFloat(min);
  max = parseFloat(max);
  // The maximum is inclusive and the minimum is inclusive
  return (Math.random() * (max - min) + min).toFixed(fixed); 
};

/* ========================================================================= */
// Десятичное округление к большему
function ceil10(number, decimals) {
  if (typeof number === `string`) {
      number = parseFloat(number);
  }
  return Math.ceil10(number, decimals);
}

/* ========================================================================= */
// Десятичное округление к меньшему
function floor10(number, decimals) {
  if (typeof number === `string`) {
      number = parseFloat(number);
  }
  return Math.floor10(number, decimals);
}

/* ========================================================================= */
// Десятичное округление к ближайшему
if (!Math.round10) {
  Math.round10 = function (value, exp) {
  return decimalAdjust("round", value, exp);
  };
}
// Десятичное округление вниз
if (!Math.floor10) {
  Math.floor10 = function (value, exp) {
  return decimalAdjust("floor", value, exp);
  };
}
// Десятичное округление вверх
if (!Math.ceil10) {
  Math.ceil10 = function (value, exp) {
  return decimalAdjust("ceil", value, exp);
  };
}

/* ========================================================================= */
function decimalAdjust(type, value, exp) {
  // Если степень не определена, либо равна нулю...
  if (typeof exp === "undefined" || +exp === 0) {
  return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // Если значение не является числом, либо степень не является целым числом...
  if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
  return NaN;
  }
  // Сдвиг разрядов
  value = value.toString().split("e");
  value = Math[type](+(value[0] + "e" + (value[1] ? +value[1] - exp : -exp)));
  // Обратный сдвиг
  value = value.toString().split("e");
  return +(value[0] + "e" + (value[1] ? +value[1] + exp : exp));
}

/* ========================================================================= */
// Math exports
exports.randomBetweenInt = randomBetweenInt;
exports.randomBetweenFloat = randomBetweenFloat;
exports.ceil10 = ceil10;
exports.floor10 = floor10;

/* ========================================================================= */
// Math tests
/* 
const {randomBetweenFloat, randomBetweenInt} = require('./src/math');

;(
  async () => {
    for (let i = 0; i < 100; i++) {
      console.log(randomBetweenInt(1, 4, 100))
      console.log(randomBetweenFloat(2.999, 3.001, 3))
    }
  }
)();


console.log(floor10(3.00002731231, -5))     // 3.00002
console.log(ceil10(3.00002731231, -5))      // 3.00003
console.log(floor10(3.00002731231, -6))     // 3.000027
console.log(ceil10(3.00002731231, -6))      // 3.000028

*/