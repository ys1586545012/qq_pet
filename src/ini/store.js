const Store = require("electron-store");

/**
 * electron-store 封装。
 * 字段说明：ElectronStore 是底层持久化实例，option 保存配置文件名和异常清理策略。
 */
class StoreAdapter {
  ElectronStore = null;

  option = {
    name: "config-macos",
    fileExtension: "json",
    clearInvalidConfig: true,
  };

  constructor() {
    this.ElectronStore = new Store(this.option);
  }

  /** 写入指定配置项。 */
  setItem(name, value) {
    this.ElectronStore.set(name, value);
  }

  /** 读取指定配置项；读取失败时沿用原逻辑返回空对象。 */
  getItem(name) {
    try {
      return this.ElectronStore.get(name);
    } catch (error) {
      return {};
    }
  }

  /** 删除指定配置项。 */
  removeItem(name) {
    this.ElectronStore.delete(name);
  }

  /** 清空所有配置。 */
  clear() {
    this.ElectronStore.clear();
  }
}

global.$Store = new StoreAdapter();
module.exports = {};
