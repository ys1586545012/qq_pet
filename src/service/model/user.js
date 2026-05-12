require("../request");

module.exports = {
  /** 已禁用远程日志获取，避免联网和遥测。 */
  getLogs: () => Promise.resolve({}),

  /** 已禁用远程宠物配置获取，使用本地资源和默认配置。 */
  getPetConfig: () => Promise.resolve({}),

  /** 已禁用远程宠物信息上报。 */
  setQPetInfo: () => Promise.resolve({}),
};
