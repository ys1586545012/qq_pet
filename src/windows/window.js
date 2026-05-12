const { BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

let icon = "";
try {
  icon = path.join(__dirname, "../assets/penguin.ico");
} catch (error) {}

/**
 * 桌宠窗口的默认 Electron 配置。
 * 所有弹窗默认透明、无边框、置顶，具体尺寸由每个窗口 main.js 传入。
 */
const defaultOption = {
  width: undefined,
  height: undefined,
  frame: false,
  transparent: true,
  resizable: false,
  icon,
  skipTaskbar: true,
  alwaysOnTop: true,
  hasShadow: false,
  backgroundColor: "#00000000",
  roundedCorners: false,
  webPreferences: {
    plugins: false,
    nodeIntegration: true,
    contextIsolation: true,
    worldSafeExecuteJavaScript: true,
    webSecurity: false,
  },
};

/**
 * 统一管理主宠物窗口、弹窗和工具窗口。
 *
 * 原项目把每个页面拆成 index.html/index.css/index.js，再由 app.html 承载；
 * 这里继续保留该装载方式，避免破坏现有资源路径和 IPC 通道。
 */
class AddWindow {
  constructor() {
    this.wins = {};
    this.preloads = {};
  }

  /** 当前全局窗口透明度，部分固定窗口始终保持 1。 */
  winOpacity = 1;

  /** 允许用户直接看到的配置窗口。 */
  canSeeWin = ["setup"];

  /** 始终置顶显示的工具窗口。 */
  alwaysSeeWin = ["floatStyle"];

  /** 不跟随全局透明度的窗口名称。 */
  opt = { names: ["setup", "rightMenu", "smallGame", "viewSwf"] };

  /**
   * 创建或复用窗口。
   * @param {object} option 窗口配置，必须包含 name。
   * @returns {Promise<BrowserWindow>} Electron 窗口实例。
   */
  open(option) {
    option.default = { ...defaultOption, ...option.default };

    if (option?.webPreferences) {
      option.default.webPreferences = {
        ...option.default.webPreferences,
        ...option.webPreferences,
      };
    }

    if (!option.name) return Promise.reject("参数错误");

    try {
      option.default.webPreferences.preload = path.join(
        __dirname,
        `./${option.loadFile || option.name}/preload.js`,
      );
    } catch (error) {}

    const existingWindow = this.wins[option.name]?.win;
    if (existingWindow) {
      if (option.closeType === "hide") {
        existingWindow.show();
        if (typeof option.onshow === "function") option.onshow(existingWindow);
      }
      return Promise.resolve(existingWindow);
    }

    this.wins[option.name] = { win: null, preload: null, option: null };

    // 原逻辑会给普通窗口额外加 10px，避免透明边缘被裁切。
    if (
      option?.default?.width &&
      option?.default?.height &&
      !option?.default?.notChangeSize
    ) {
      option.default.width += 10;
      option.default.height += 10;
    }

    this.wins[option.name].option = option;
    this.wins[option.name].win = new BrowserWindow(option.default);

    return option.url
      ? this.openUrl(this.wins[option.name])
      : this.doListener(this.wins[option.name]);
  }

  /**
   * 加载本地 Vue 页面。
   * 页面内容会被注入到 app.html 的 #app 容器，然后依次插入 CSS 和 JS。
   */
  doListener(winRecord) {
    return new Promise((resolve) => {
      const { win, option } = winRecord;
      win.loadFile(path.join(__dirname, "./app.html"));
      win.setIgnoreMouseEvents(true);

      const jsFiles = ["./lib/icon/iconfont.js", "./lib/vue/vue.global.js"];
      if (option?.jsFiles) jsFiles.unshift(...option.jsFiles);
      if (option?.jsFilesAfter) jsFiles.push(...option.jsFilesAfter);
      jsFiles.push(`./${option.loadFile || option.name}/index.js`);

      const cssFiles = [
        "./lib/ant-design/antd.css",
        "./css/index.css",
        "./css/util.css",
        "./css/keyframes.css",
        `./${option.loadFile || option.name}/index.css`,
      ];
      if (option.cssFiles) cssFiles.unshift(...option.cssFiles);

      win.webContents.on("did-finish-load", () => {
        this.injectLocalPage(winRecord, cssFiles, jsFiles);
        if (typeof option.onload === "function") option.onload(win);
      });

      resolve(win);
      win.removeMenu();
      // 开发模式下自动打开渲染进程控制台；也兼容单个窗口显式 openDevTools。
      if (global.initData?.IS_DEV || option.default.openDevTools) {
        win.openDevTools({ mode: "detach" });
      }
      win.setIgnoreMouseEvents(false);
      this.runCreatedHook(winRecord);
      this.bindWindowLifecycle(winRecord);
    });
  }

  /**
   * 注入本地窗口页面需要的模板、样式和脚本。
   * @param {{win: BrowserWindow, option: object}} winRecord 窗口记录。
   * @param {string[]} cssFiles 需要插入的 CSS 文件。
   * @param {string[]} jsFiles 需要执行的 JS 文件。
   */
  injectLocalPage(winRecord, cssFiles, jsFiles) {
    const { win, option } = winRecord;

    try {
      const html = fs
        .readFileSync(
          path.join(
            __dirname,
            `./${option.loadFile || option.name}/index.html`,
          ),
        )
        .toString();

      if (global.$test) this.winOpacity = 0.2;

      try {
        let opacity = getSys("opacity");
        if (opacity < 0 || !opacity) opacity = 0.1;
        const normalizedOpacity = ((10 * opacity) | 0) / 10;
        if (normalizedOpacity) this.winOpacity = normalizedOpacity;
      } catch (error) {}

      if (this.opt.names.includes(option.name)) {
        win.setOpacity(1);
      } else {
        win.setOpacity(this.winOpacity);
      }

      win.webContents.executeJavaScript(`
        const seeApp = () => {
          const app = document.getElementById('app');
          app.style.display = 'flex';
          app.style.opacity = 1;
        };
        const changeOpacity = (opacity) => {
          const app = document.getElementById('app');
          app.style.opacity = opacity || '1';
        };
        let appDom = document.getElementById('app');
        appDom.innerHTML = \`${html}\`;
        seeApp();
      `);
    } catch (error) {}

    for (const cssFile of cssFiles) {
      const css = fs.readFileSync(path.join(__dirname, cssFile)).toString();
      win.webContents.insertCSS(css);
    }

    for (const jsFile of jsFiles) {
      const js = fs.readFileSync(path.join(__dirname, jsFile)).toString();
      win.webContents.executeJavaScript(js);
    }
  }

  /**
   * 加载外部 URL 页面，主要用于远程/调试窗口。
   * @param {{win: BrowserWindow, option: object}} winRecord 窗口记录。
   */
  openUrl(winRecord) {
    return new Promise((resolve) => {
      const { win, option } = winRecord;
      let loadingWindow = new BrowserWindow({
        width: 80,
        height: 80,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
      });

      loadingWindow.setIgnoreMouseEvents(true);
      loadingWindow.loadFile(path.join(__dirname, "./app.html"));
      win.loadURL(option.url);
      win.webContents.on("did-finish-load", () => {
        if (loadingWindow?.close) loadingWindow.close();
        loadingWindow = null;
        win.show();
        win.focus();
        if (typeof option.onload === "function") option.onload(win);
      });

      resolve(win);
      win.removeMenu();
      // URL 窗口同样跟随 npm run dev 自动打开控制台。
      if (global.initData?.IS_DEV || option.default.openDevTools) {
        win.openDevTools({ mode: "detach" });
      }
      this.runCreatedHook(winRecord);

      win.on("closed", () => {
        if (loadingWindow?.close) loadingWindow.close();
        loadingWindow = null;
        this.removePreload(option);
        this.removeGetinfo(option);
        winRecord.win = null;
        if (typeof option.onclose === "function") option.onclose(win);
      });
    });
  }

  /**
   * 执行窗口创建回调，并把 preload/getinfo 注册函数暴露给各窗口 main.js。
   * @param {{win: BrowserWindow, option: object}} winRecord 窗口记录。
   */
  runCreatedHook(winRecord) {
    const { win, option } = winRecord;
    if (typeof option.created !== "function") return;

    option.created({
      vm: win,
      preloads: (handlers) => {
        option.preloads = handlers || {};
        for (const channel in handlers) ipcMain.on(channel, handlers[channel]);
      },
      getinfo: (listeners) => {
        if (!global?.listenInfo) return;
        option.getinfo = listeners || [];
        for (const listener of listeners) listenInfo(listener);
      },
    });
  }

  /**
   * 绑定关闭/隐藏生命周期，确保 IPC 和状态监听在窗口销毁时释放。
   */
  bindWindowLifecycle(winRecord) {
    const { win, option } = winRecord;

    win.on("close", (event) => {
      if (option.closeType !== "hide") return;
      if (typeof option.onhide === "function") option.onhide(win);
      event.preventDefault();
      win.hide();
    });

    win.on("closed", () => {
      if (typeof option.onclose === "function") option.onclose(win);
      this.removePreload(option);
      this.removeGetinfo(option);
      winRecord.win = null;
    });
  }

  /**
   * 重新注册全局 preload IPC 监听。
   * @param {Record<string, Function>} handlers IPC 监听器映射。
   */
  setPreload(handlers = {}) {
    for (const channel in handlers)
      ipcMain.removeListener(channel, handlers[channel]);
    for (const channel in handlers) ipcMain.on(channel, handlers[channel]);
    this.preloads = { ...this.preloads, ...handlers };
  }

  /** 移除指定窗口注册的 IPC 监听。 */
  removePreload(option) {
    if (!option.name) return;
    const handlers = option.preloads || {};
    for (const channel in handlers)
      ipcMain.removeListener(channel, handlers[channel]);
  }

  /** 移除指定窗口注册的数据监听。 */
  removeGetinfo(option) {
    if (!global?.unListenInfo || !option.name) return;
    const listeners = option.getinfo || [];
    for (const listener of listeners) unListenInfo(listener);
  }

  /** 移除指定窗口注册的 websocket 回调。 */
  removeWsMethods(option) {
    if (!global?.deleteWsBackMsg || !option.name) return;
    const methods = option.wsMethods || [];
    for (const method of methods) deleteWsBackMsg(method);
  }

  /** 设置除白名单窗口外的全局透明度。 */
  setOpacity(opacity) {
    this.winOpacity = !opacity || opacity <= 0 ? 0.1 : opacity;
    for (const name in this.wins) {
      const win = this.wins[name]?.win;
      if (!win?.setOpacity) continue;
      win.setOpacity(this.opt.names.includes(name) ? 1 : this.winOpacity);
    }
  }
}

module.exports = AddWindow;
