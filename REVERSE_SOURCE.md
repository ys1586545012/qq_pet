# QQ 宠物源码逆向说明

本目录由 `qq-pet-macos` 逆向整理而来，保留 Electron + Vue 3 全局运行时架构，入口仍为 `main.js`。

## 运行方式

- 安装依赖：`npm install`
- 启动桌宠：`npm start`
- 启动工具窗口：`NODE_TOOL=floatStyle npm start`

## 源码结构

- `main.js`：Electron 应用入口，负责单实例、工具模式和主流程启动。
- `src/ini/`：全局工具、存储、系统状态、屏幕尺寸和宠物数据初始化。
- `src/windows/window.js`：窗口装载器，负责把各窗口的 `index.html`、`index.css`、`index.js` 注入到 `app.html`。
- `src/windows/main/`：桌宠主窗口。
- `src/windows/popups/`：商城、设置、右键菜单、状态面板、气泡提示等弹窗。
- `src/windows/tool/`：独立工具窗口。
- `src/assets/`：宠物动作、图标、商品、提示等原始资源。

## 页面清单

所有业务页面继续使用 Vue 3 `Vue.createApp(...)` 挂载到 `#app`：

- `src/windows/main`
- `src/windows/model`
- `src/windows/popups/backRoom`
- `src/windows/popups/control`
- `src/windows/popups/fishing`
- `src/windows/popups/infoCard`
- `src/windows/popups/rightMenu`
- `src/windows/popups/setup`
- `src/windows/popups/smallGame`
- `src/windows/popups/stateInfo`
- `src/windows/popups/store`
- `src/windows/popups/tip`
- `src/windows/popups/windowTip`
- `src/windows/tool/floatStyle`
- `src/windows/tool/urlWindow`
- `src/windows/tool/viewSwf`

## 约束

- 不改 IPC 通道名称，保持 `window.electronAPI.*` 与主进程监听一一对应。
- 不改资源相对路径，避免 SWF/Ruffle、图标和 CSS 背景图失效。
- 第三方库目录保持原样，不参与格式化。
