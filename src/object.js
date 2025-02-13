/* ========================================================================= */
// extendObject and update keys
function extendObjectAndReplace(obj1, obj2){

  for (let prop in obj2){
      obj1[prop] = obj2[prop];
  }

  return obj1;
}

/* ========================================================================= */
// extendObject with non-exist keys
function extendObject(obj1, obj2){

  for (let prop in obj2){
      if (!obj1[prop]) obj1[prop] = obj2[prop];
  }

  return obj1;
}


/* ========================================================================= */
// Objects exports
exports.extendObjectAndReplace = extendObjectAndReplace;
exports.extendObject = extendObject;

/* ========================================================================= */
// Objects tests

/*
  const {extendObjectAndReplace} = require('./src/object');

  const a = {a: 1}
  const b = {a: 2, b: 3}
  extendObjectAndReplace(a, b);
  console.log(a, b) // { a: 2, b: 3 } { a: 2, b: 3 }
*/

/*
  const {extendObject} = require('./src/object');

  const a = {a: 1}
  const b = {a: 2, b: 3}
  extendObject(a, b);
  console.log(a, b) // { a: 1, b: 3 } { a: 2, b: 3 }
 */