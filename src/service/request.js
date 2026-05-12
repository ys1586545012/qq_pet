const axios = require("axios");
const configData = require("./config");

/** HTTP 客户端，保留原项目的 baseUrl/baseUrlFile 自动拼接行为。 */
const service = axios.create({ timeout: 30000 });

service.interceptors.request.use(
  (config) => {
    const baseUrl =
      config?.opt?.head ||
      (config?.opt?.isFile ? configData.baseUrlFile : configData.baseUrl);
    config.url = baseUrl + config.url;
    return config;
  },
  (error) => Promise.reject(error),
);

service.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
);

module.exports = service;
