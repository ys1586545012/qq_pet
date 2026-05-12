// 初始化全局工具、存储、系统状态和桌宠数据模块。
require("../windows/util/aes.js");
require("./tool.js");
require("./store.js");
require("./sys.js");
require("./screen.js");
require("./safe.js");

// 独立工具窗口启动时不初始化桌宠状态，保持原应用的轻量工具模式。
if (!global.initData?.NODE_TOOL) {
  require("./pet.js");
}

module.exports = {};
