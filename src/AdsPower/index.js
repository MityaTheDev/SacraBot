const { axiosRequest } = require("../request.js");
const logger = require("../logger.js");
const Config = require("../../configs/ads.json");

/* ========================================================================= */
// Returns status, ws or null
const browserStatusBySN = async (serialNumber) => {
  try {
    const requestConfig = {};
    requestConfig.method = `GET`;
    const url =
      `${Config.API_ENDPOINT}:${Config.API_PORT}` +
      `/api/v1/browser/active?serial_number=${serialNumber}`;
    const response = await axiosRequest(url, requestConfig);
    console.log("axious response:", response.status);
    if (response?.data.code === -1) {
      logger.error(response?.data);
      return null;
    }
    if (response?.data?.data) return response.data.data;
    return null;
  } catch (err) {
    logger.log(`browserStatusBySN ERROR: ${err.message}`);
    // logger.error(err);
    return null;
  }
};

/* ========================================================================= */
// Returns status or null
async function browserCloseBySN(serialNumber) {
  try {
    const requestConfig = {};
    requestConfig.method = `GET`;
    const url =
      `${Config.API_ENDPOINT}:${Config.API_PORT}` +
      `/api/v1/browser/stop?serial_number=${serialNumber}`;
    const response = await axiosRequest(url, requestConfig);
    logger.log(response.data);
    if (response?.data.code === -1) {
      logger.error(response?.data);
      return null;
    }
    if (response?.data) return response.data;
    return null;
  } catch (err) {
    logger.log(`browserStatusBySN ERROR: ${err.message}`);
    logger.error(err);
    return null;
  }
}

/* ========================================================================= */
// Returns status or null
async function browserOpenBySN(serialNumber) {
  try {
    const requestConfig = {};
    requestConfig.method = `GET`;
    const url =
      `${Config.API_ENDPOINT}:${Config.API_PORT}` + `/api/v1/browser/start`;
    requestConfig.params = Config.start_request;
    requestConfig.params.serial_number = serialNumber;
    const response = await axiosRequest(url, requestConfig);
    if (response?.data.code === -1) return null;
    if (response?.data) return response.data;
    return null;
  } catch (err) {
    logger.log(`browserStatusBySN ERROR: ${err.message}`);
    logger.error(err);
    return null;
  }
}

/* ========================================================================= */
// ADS exports
exports.browserStatusBySN = browserStatusBySN;
exports.browserCloseBySN = browserCloseBySN;
exports.browserOpenBySN = browserOpenBySN;

/* ========================================================================= */
// ADS tests

/*
  const Ads = require('./src/AdsPower/index')

  ;(async () => {
    logger.log(await Ads.browserStatusBySN(`2`).catch(err => err)); // CLOSED: { status: 'Inactive' }
    logger.log(await Ads.browserStatusBySN(`1`).catch(err => err)); // CLOSED: { status: 'Active', ws: {}, debug_port /// }
  })();
*/
