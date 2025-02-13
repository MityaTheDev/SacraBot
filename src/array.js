const math = require('./math');

/* ========================================================================= */
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
};

/* ========================================================================= */
//Функция равномерного деления массива на chunks
// splitArrayTo([a,b,c,d,e], 3) => [[a,b,c], [d,e]] 
const splitArray = (inputArray, itemsPerChunk) => {
    
  var result = inputArray.reduce((resultArray, item, index) => { 
    const chunkIndex = Math.floor(index/itemsPerChunk)
  
    if(!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] // start a new chunk
    }
  
    resultArray[chunkIndex].push(item)
  
    return resultArray
  }, []);

  return result;
};

/* ========================================================================= */
function randomIndexArray(array){
  return math.randomBetweenInt(0, array.length - 1);
};

/* ========================================================================= */
function randomElementOfArray(array){
  return array[math.randomBetweenInt(0, array.length - 1)];
};


/* ========================================================================= */
// Array exports
exports.shuffle = shuffle;
exports.splitArray = splitArray;
exports.randomIndexArray = randomIndexArray;
exports.randomElementOfArray = randomElementOfArray;

/* ========================================================================= */
// Array tests

/*
  const {shuffle} = require('./src/array');

  let arr = [
    1, 2, 3,
    4, [1,2],
    {5: 6}, 7, 8,
    9, 10 
  ]
  console.log(shuffle(arr)) // [ 8, 9, 2, [ 1, 2 ], 10, 4, 3, 1, { '5': 6 }, 7 ]
  console.log(shuffle(arr)) // [ [ 1, 2 ], 2, 1, 4, 3, 8, 7, 9, 10, { '5': 6 } ]
*/

/*
  const {splitArray} = require('./src/array');

  let arr = [
    1, 2, 3,
    4, [1,2],
    {5: 6}, 7, 8,
    9, 10 
  ]
  console.log(splitArray(arr, 2)) // [ [ 1, 2 ], [ 3, 4 ], [ [ 1, 2 ], { '5': 6 } ], [ 7, 8 ], [ 9, 10 ] ]
  console.log(splitArray(arr, 5)) // [ [ 1, 2, 3, 4, [ 1, 2 ] ], [ { '5': 6 }, 7, 8, 9, 10 ] ]
*/

/*
  const {randomIndexArray} = require('./src/array');

  let arr = [
    1, 2, 3,
    4, [1,2],
    {5: 6}, 7, 8,
    9, 10 
  ]

  console.log("length", arr.length);
  for (let i = 0; i < 100; i++) console.log(randomIndexArray(arr)) 
*/


/*
  const {randomElementOfArray} = require('./src/array');

  let arr = [
    1, 2, 3,
    4, [1,2],
    {5: 6}, 7, 8,
    9, 10 
  ]

  console.log("length", arr.length);
  for (let i = 0; i < 100; i++) console.log(randomElementOfArray(arr))
*/ 