const {extendObject} = require('./object');

async function axiosRequest(url, config) {
  const axios = require('axios');
  const obj = {url: url, method: config.method ? config.method : `get`};
  extendObject(obj, config);
  let response =  await axios.request(obj).then(response => response);
  return response;
}

/* ========================================================================= */
// Request exports
exports.axiosRequest = axiosRequest;

/* ========================================================================= */
// request tests
/*
  simple GET
  const {axiosRequest} = require('./src/request');

  const config = {};
  const url = `https://api.ipify.org?format=json`;
  config.method = `GET`;
  const proxy = {
    protocol: 'http',
    host: '127.0.0.1',
    // hostname: '127.0.0.1' // Takes precedence over 'host' if both are defined
    port: 9000,
    auth: {
      username: 'username',
      password: 'password'
    }
  };
  config.proxy = proxy;
  ;(async () => {
    let response = await axiosRequest(url, config);
    console.log(response.data);
  })();
*/