(() => {
  var __webpack_modules__ = {
      953: (module) => {
        const _require = eval("require"),
          checkUpdate = _require("../util/UpdateController"),
          { app, globalShortcut, screen } = _require("electron"),
          { myPet } = _require("../util/pet/petIndex"),
          { MenuCreate } = _require("./menu");
        global.petControl = new myPet();
        const stateInfo = _require("../popups/stateInfo/main.js"),
          control = _require("../popups/control/main.js"),
          tip = _require("../popups/tip/main.js");
        let saveSpeakData = null;
        global.openSpeak = (e) => {
          saveSpeakData = e;
        };
        const clipboardWatcher = _require("./clip.js");
        let clipboardWatcherMain = null;
        const rightMenu = _require("../popups/rightMenu/main.js"),
          { getCommunication } = _require("../util/pet/communication"),
          { Shotycuts } = _require("./shortcuts.js");
        let shotycutsMain = null;
        (_require("./Notification.js"),
          (global.toolWindow = {
            floatStyle: _require("../tool/floatStyle/main.js"),
            urlWindow: _require("../tool/urlWindow/main"),
            viewSwf: _require("../tool/viewSwf/main"),
          }));
        class mainClass {
          constructor(e) {
            ((this.window = null),
              (this.show = !1),
              (this.name = "main"),
              (this.menu = null),
              (this.mouseIgnoreState = !1),
              (this.mouseHitTimer = null),
              (this.mouseHitRequestId = 0),
              (this.mouseHotArea = null),
              (this.loadTime = { seeControlTime: null }));
          }
          reLoad = !0;
          /**
           * 设置主宠物窗口是否穿透鼠标；透明像素穿透时开启光标轮询，用于恢复实体像素点击。
           * @param {BrowserWindow} e 主宠物窗口
           * @param {boolean} t true 表示鼠标事件穿透到桌面或下层窗口
           */
          setMouseIgnore(e, t) {
            try {
              if (!e || ("function" == typeof e.isDestroyed && e.isDestroyed()))
                return;
              let o = !!t;
              if (this.mouseIgnoreState != o) {
                this.mouseIgnoreState = o;
                o
                  ? e.setIgnoreMouseEvents(!0, { forward: !0 })
                  : e.setIgnoreMouseEvents(!1);
              }
              o ? this.startMouseHitWatch(e) : this.stopMouseHitWatch();
            } catch (e) {}
          }
          /**
           * 窗口处于点击穿透时，主进程继续轮询全局光标，避免 Windows 下收不到 mousemove 后无法恢复。
           * @param {BrowserWindow} e 主宠物窗口
           */
          startMouseHitWatch(e) {
            if (this.mouseHitTimer) return;
            this.mouseHitTimer = setInterval(() => {
              try {
                if (!e || ("function" == typeof e.isDestroyed && e.isDestroyed()))
                  return void this.stopMouseHitWatch();
                let t = e.getBounds(),
                  o = screen.getCursorScreenPoint(),
                  n = o.x - t.x,
                  i = o.y - t.y;
                if (n < 0 || i < 0 || n > t.width || i > t.height) return;
                if (this.isInMouseHotArea(n, i))
                  return void this.setMouseIgnore(e, !1);
                this.mouseHitRequestId++;
                e.webContents.send("main_bus-html_checkMouseHit", {
                  id: this.mouseHitRequestId,
                  clientX: n,
                  clientY: i,
                });
              } catch (e) {}
            }, 16);
          }
          /** 停止透明区域命中轮询。 */
          stopMouseHitWatch() {
            this.mouseHitTimer &&
              (clearInterval(this.mouseHitTimer), (this.mouseHitTimer = null));
          }
          /** 判断点是否落在旋转椭圆内，和渲染进程的企鹅轮廓模型保持一致。 */
          isInEllipse(e, t, o, n, i, a, s = 0) {
            let l = Math.cos(s),
              c = Math.sin(s),
              r = e - o,
              h = t - n,
              d = r * l + h * c,
              u = -r * c + h * l;
            return (d * d) / (i * i) + (u * u) / (a * a) <= 1;
          }
          /** 使用企鹅头、身体、翅膀和脚的组合轮廓判断是否应恢复点击。 */
          isInPenguinHotShape(e, t, o) {
            if (!o?.rectWidth || !o?.rectHeight) return !0;
            let l = o.hitOffsetX || 0,
              n = (e - o.rectLeft) / o.rectWidth - l,
              i = (t - o.rectTop) / o.rectHeight,
              a = Math.max(0.01, (o.padding || 0) / 200),
              s = [
                [0.5, 0.485, 0.148 + a, 0.09 + a, 0],
                [0.5, 0.593, 0.218 + a, 0.132 + a, 0],
                [0.5, 0.685, 0.175 + a, 0.182 + a, 0],
                [0.5, 0.765, 0.218 + a, 0.135 + a, 0],
                [0.34, 0.665, 0.048 + a, 0.152 + a, -0.45],
                [0.66, 0.665, 0.048 + a, 0.152 + a, 0.45],
                [0.4, 0.895, 0.086 + a, 0.034 + 0.35 * a, -0.08],
                [0.6, 0.895, 0.086 + a, 0.034 + 0.35 * a, 0.08],
              ];
            for (let o of s)
              if (this.isInEllipse(n, i, o[0], o[1], o[2], o[3], o[4]))
                return !0;
            return !1;
          }
          /**
           * 判断主进程缓存的宠物热区是否包含光标；用于穿透状态下优先恢复点击。
           * @param {number} e 鼠标在窗口内的 x
           * @param {number} t 鼠标在窗口内的 y
           */
          isInMouseHotArea(e, t) {
            let o = this.mouseHotArea;
            return (
              o &&
              e >= o.left &&
              t >= o.top &&
              e <= o.right &&
              t <= o.bottom &&
              ("penguin" != o.shape || this.isInPenguinHotShape(e, t, o))
            );
          }
          cleate(e) {
            let { web: t, defaultPetInfo: o } = e;
            ((this.maxSize = [180, 180]),
              (this.nowPosition = [0, 0]),
              (this.width = this.maxSize[0]),
              (this.height = this.maxSize[1]));
            let n = this,
              i = null;
            ((this.bd = !0), (this.wellClose = !1), (this.petState = ""));
            let a = {};
            (this.bd
              ? (a.jsFiles = [
                  "./util/move.js",
                  "./util/pet/swfPet.js",
                  "../service/websocket.js",
                ])
              : (a.url = `http://${t.host}:${t.post}/${t.fileName}/windows/main/indexOnline.html`),
              windowsMain
                .open({
                  name: this.name,
                  ...a,
                  default: {
                    width: this.width || getScreenSize()[0],
                    height: this.height || getScreenSize()[1],
                  },
                  created(e) {
                    let { vm: t, preloads: a, getinfo: s, wsMethods: l } = e;
                    n.nowPosition = t.getPosition();
                    let c = {
                      food: "eat",
                      commodity: "clean",
                      medicine: "cure",
                    };
                    ((global.changeTraysIcon = (e) => {
                      let {
                        name: t = null,
                        time: o = null,
                        change: a = !1,
                      } = e;
                      n.menu?.activeTraysIcon
                        ? n.menu?.activeTraysIcon({
                            name: t,
                            time: o,
                            change: a,
                          })
                        : (i = { name: t, time: o, change: a });
                    }),
                      petControl.init({
                        petInfo: getPetInfo(),
                        fn: {
                          backState: (e = {}) => {
                            let {
                              type: t,
                              msg: o,
                              val: n,
                              speak: i,
                              speakType: a,
                              otherData: s,
                              active: l = null,
                              communication: c = null,
                              change: r = !1,
                            } = e;
                            (i &&
                              (o || c) &&
                              openSpeak({
                                data: {
                                  type: a || "text",
                                  data: o || "",
                                  ...(s || {}),
                                },
                                active: l || "speak",
                                nextActiveStr: "speak,sick,hungry,dirty",
                                communication: c || null,
                              }),
                              changeTraysIcon({ name: t, change: r }));
                          },
                          backActive: (e = {}) => {
                            if (
                              (setSay("backActive :>> ", e),
                              e.msg || e.communication)
                            ) {
                              let t = c?.[e.type] || e.type,
                                o = "";
                              ("cure" == t &&
                                ("ill" == e.overType
                                  ? (t = "sick")
                                  : "dead" == e.overType
                                    ? (t = "die")
                                    : "dead" == e.illType
                                      ? ((t = "revival"), (o = "revival"))
                                      : "err" == e.overType &&
                                        ((t = "speak"), (o = "speak"))),
                                openSpeak({
                                  data: {
                                    type: "text",
                                    data: e.msg,
                                    finish: "revival" == t,
                                  },
                                  active: t,
                                  communication: e.communication || null,
                                  nextActiveStr: o,
                                }));
                            } else
                              t.webContents.send("main_bus-html_active", {
                                active: c?.[e.type] || e.type,
                              });
                          },
                        },
                      }),
                      (global.setSay = function (...e) {
                        let o = ["↓↓↓↓↓↓↓↓↓↓↓" + tool.getTime()];
                        for (let e in arguments) o.push(arguments[e]);
                        (o.push("↑↑↑↑↑↑↑↑↑↑"),
                          t.webContents.send(
                            "main_bus-html_setSay",
                            JSON.stringify(o),
                          ));
                      }),
                      (global.doMovePosition = (e) => {
                        let i = e?.maxSize?.[0] ?? n.maxSize[0],
                          s = e?.maxSize?.[1] ?? n.maxSize[1];
                        e?.toPosition
                          ? ((e.maxSize = n.maxSize),
                            (i = n.maxSize[0]),
                            (s = n.maxSize[1]),
                            (n.nowPosition = [...e.toPosition]))
                          : (n.nowPosition = [
                              n.nowPosition[0] - e.next[0],
                              n.nowPosition[1] - e.next[1],
                            ]);
                        let r = clampPositionToWorkspace(
                          n.nowPosition[0],
                          n.nowPosition[1],
                          i,
                          s,
                          !1,
                        );
                        n.nowPosition = [r.x, r.y];
                        let o = {
                          x: +n.nowPosition[0],
                          y: +n.nowPosition[1],
                          height: 144,
                          width: 144,
                        };
                        var a, l;
                        (e.notChangeSize ||
                          ((n.maxSize = e.maxSize),
                          (o = {
                            ...o,
                            height: e.maxSize[1],
                            width: e.maxSize[0],
                          })),
                          t.setBounds(o),
                          (a = n.nowPosition),
                          (l = getScreenSize()),
                          tip.show &&
                            tip.setPosition({
                              position: a,
                              maxSize: n.maxSize,
                            }),
                          n.isStop() ||
                            (control?.isCleate
                              ? control.setPosition({
                                  position: a,
                                  screenData: l,
                                  maxSize: n.maxSize,
                                })
                              : control.cleate(
                                  {
                                    position: a,
                                    screenData: l,
                                    maxSize: n.maxSize,
                                  },
                                  t,
                                ),
                            t.webContents.send(
                              "main_bus-html_setPotision",
                              a,
                              l,
                              getWorkspaceBounds(),
                            )));
                      }),
                      subscribeWorkspaceChange(() => {
                        try {
                          if (!t || ("function" == typeof t.isDestroyed && t.isDestroyed()))
                            return;
                          doMovePosition({
                            toPosition: [...n.nowPosition],
                            maxSize: n.maxSize,
                            notChangeSize: !0,
                          });
                        } catch (e) {
                          console.error("[main] workspace change:", e);
                        }
                      }));
                    let r = [
                      n.nowPosition[0] - +o.info.lastX,
                      n.nowPosition[1] - +o.info.lastY,
                    ];
                    (doMovePosition({ next: r, maxSize: n.maxSize }),
                      app.on("before-quit", (e) => {
                        if (!n.wellClose) {
                          ((n.wellClose = !0),
                            e.preventDefault(),
                            setOutProjectMain(!0),
                            setSys({ name: "doNotDisturb", value: !1 }),
                            setPetInfo({
                              info: {
                                lastX: n.nowPosition[0],
                                lastY: n.nowPosition[1],
                              },
                            }),
                            setTimeout(() => {
                              try {
                                app.exit([!0]);
                              } catch (e) {}
                            }, 3e4),
                            clipboardWatcherMain?.stop &&
                              clipboardWatcherMain.stop(),
                            shotycutsMain?.cleanOur && shotycutsMain.cleanOur(),
                            n.menu?.activeTraysIcon &&
                              n.menu?.activeTraysIcon({
                                name: "leave",
                                change: !0,
                              }),
                            n.menu?.setTrayToolTip &&
                              n.menu?.setTrayToolTip("正在退出···"));
                          for (let e in windowsMain.wins)
                            if ("main" != e && windowsMain.wins[e]?.win?.close)
                              try {
                                windowsMain.wins[e].win.close();
                              } catch (e) {}
                          openSpeak({
                            data: {
                              type: "text",
                              load: "exit",
                              finish: "exit",
                            },
                            communication: ["state", "exit"],
                            active: "exit",
                            nextActiveStr: "exit",
                          });
                        }
                      }),
                      app.on("second-instance", () => {
                        if (!n.isStop())
                          try {
                            (openSpeak({
                              data: {
                                type: "text",
                                data: "[host]，我在这里 ~~~",
                              },
                              active: "appear",
                              nextActiveStr: "appear",
                            }),
                              setTimeout(() => {
                                n.appear();
                              }, 80));
                          } catch (e) {
                            setTimeout(() => {
                              app.quit();
                            }, 500);
                          }
                      }),
                      a({
                        "html_set-say": (e, t) => {
                          mylog(t, " --- html_set-say say");
                        },
                        "html_bus-Main": (e, o) => {
                          if ("mounted" == o.event) {
                            petControl.startGrowUp();
                            if (getSys("llmEnabled")) {
                              llmService.prefetch("smallTalk", getPetInfo());
                              llmService.prefetch("toHeartTolk", getPetInfo());
                            }
                            if (
                              typeof focusGuard !== "undefined" &&
                              focusGuard?.start
                            )
                              focusGuard.start();
                            let e = getPetInfo();
                            (t.webContents.send("main_bus-html", {
                              data: "load",
                              type: "load",
                              screenSize: n.screenSize,
                              nowPosition: n.nowPosition,
                              maxSize: n.maxSize,
                              petInfo: e,
                              bd: n.bd,
                            }),
                              n.menu?.setTrayToolTip(
                                e.info.host + "家的" + e.info.name,
                              ),
                              (global.nextActive = (e) => {
                                t.webContents.send("main_m_nextActive_h", {
                                  data: JSON.stringify(e),
                                });
                              }),
                              (global._buildLLMCtx = (kind) => {
                                const pi = getPetInfo();
                                const info = pi?.info || {};
                                const maxInfo = pi?.maxInfo || {};
                                if (kind === "enter") {
                                  const now = new Date();
                                  const h = now.getHours();
                                  const period =
                                    h < 6
                                      ? "凌晨"
                                      : h < 12
                                        ? "早上"
                                        : h < 14
                                          ? "中午"
                                          : h < 18
                                            ? "下午"
                                            : h < 22
                                              ? "晚上"
                                              : "深夜";
                                  const lastLogin = +info.lastLoginTime || 0;
                                  let intervalStr = "刚刚";
                                  if (lastLogin > 0) {
                                    const diffMs = Date.now() - lastLogin;
                                    const diffMin = Math.floor(diffMs / 6e4);
                                    if (diffMin >= 1440)
                                      intervalStr = `${Math.floor(diffMin / 1440)}天`;
                                    else if (diffMin >= 60)
                                      intervalStr = `${Math.floor(diffMin / 60)}小时`;
                                    else if (diffMin >= 1)
                                      intervalStr = `${diffMin}分钟`;
                                  }
                                  return {
                                    timeStr: `${period}${h}点`,
                                    intervalStr,
                                  };
                                }
                                if (kind === "levUp") {
                                  const lv = +maxInfo.level || 1;
                                  return {
                                    level: lv,
                                    ageStage:
                                      lv <= 4 ? "蛋" : lv < 9 ? "幼年" : "成年",
                                  };
                                }
                                if (
                                  kind === "stateEat" ||
                                  kind === "stateClean"
                                ) {
                                  const k =
                                    kind === "stateEat" ? "hunger" : "clean";
                                  const v = +info[k] || 0;
                                  const max = +maxInfo[k] || 3100;
                                  return {
                                    value: v,
                                    max,
                                    percent: Math.round((v / max) * 100),
                                  };
                                }
                                return null;
                              }));
                            ((global.openSpeak = (e) => {
                              let {
                                data: o,
                                active: n,
                                type: i,
                                nextActiveStr: a = "",
                                communication: s = null,
                                otherOpt: l = null,
                              } = e;
                              if (!getSys("doNotDisturb") || o?.mustSpeak) {
                                if (
                                  ("text" == o.type ||
                                    "seeTextImgs" == o.type) &&
                                  "object" == typeof s &&
                                  s?.length > 0
                                ) {
                                  let _rec = null;
                                  if (
                                    getSys("llmEnabled") &&
                                    s?.length === 1 &&
                                    ("smallTalk" === s[0] ||
                                      "toHeartTolk" === s[0])
                                  ) {
                                    _rec = llmService.dequeue(s[0]);
                                    llmService.prefetch(s[0], getPetInfo());
                                  }
                                  if (
                                    !_rec &&
                                    getSys("llmEnabled") &&
                                    getSys("llmApiKey") &&
                                    s?.length === 2 &&
                                    s[0] === "state" &&
                                    (s[1] === "eat" || s[1] === "clean")
                                  ) {
                                    const _pk =
                                      s[1] === "eat"
                                        ? "stateEat"
                                        : "stateClean";
                                    llmService
                                      .generateOnce(
                                        _pk,
                                        _buildLLMCtx(_pk),
                                        getPetInfo(),
                                      )
                                      .then((r) => {
                                        const _final = r?.tolk
                                          ? r
                                          : getCommunication(...s);
                                        openSpeak({
                                          ...e,
                                          communication: null,
                                          data: {
                                            ...o,
                                            data: _final?.tolk || o.data || "",
                                            submitText:
                                              _final?.submitText ||
                                              o.submitText ||
                                              "",
                                          },
                                        });
                                      });
                                    return;
                                  }
                                  if (!_rec) _rec = getCommunication(...s);
                                  _rec?.tolk &&
                                    ((o.data = _rec.tolk),
                                    (o.submitText = _rec?.submitText || ""));
                                }
                                (t.webContents.send("main_bus-html_active", {
                                  active: n || "speak",
                                  type: i || "speak",
                                  load: o.load
                                    ? JSON.stringify(o?.load?.msg || o)
                                    : !o.finish && JSON.stringify(o),
                                  finish: o.finish && JSON.stringify(o),
                                  otherOpt: l,
                                }),
                                  a && nextActive({ name: a }));
                              }
                            }),
                              saveSpeakData &&
                                (openSpeak(saveSpeakData),
                                (saveSpeakData = null)),
                              t.on("blur", (e) => {
                                control.show && control?.changeState("hide");
                              }),
                              n.reLoad && clearTimeout(n.reLoad),
                              (n.reLoad = setTimeout(() => {
                                n.reLoad = !1;
                              }, 2e3)));
                            let o = (e, t, o) => {
                              n.openSpeak({
                                data: {
                                  type: "text",
                                  data: e,
                                  submitText: t,
                                  form: "clip",
                                },
                                otherOpt: {
                                  type: "click",
                                  fn: () => {
                                    o && o();
                                  },
                                },
                              });
                            };
                            ((global.UpDateProgram = (e) => {
                              (console.log("UpDateProgram"),
                                checkUpdate((t) => {
                                  console.log("begin up");
                                  let i = "";
                                  "up" == t.type
                                    ? ((i = `\n                                    最新版本：${t.info?.version};\n                                    ${t.info?.releaseNotes}\n                                    ;点击下载 ~\n                                    `),
                                      o(i, "立即下载", () => {
                                        t.fn && t.fn();
                                      }))
                                    : "sc" == t.type
                                      ? ((i = `\n                                    下载进度： ${t.sc.percent}%；\n                                    当前网速： ${t.sc.speed}\n                                    `),
                                        o(i, "取消下载", () => {
                                          (t.fn && t.fn(),
                                            setTimeout(() => {
                                              n.openSpeak({
                                                data: {
                                                  type: "text",
                                                  data: "已取消下载~",
                                                  submitText: "ok",
                                                  form: "clip",
                                                },
                                              });
                                            }, 0));
                                        }))
                                      : "down" == t.type
                                        ? o(
                                            "最新版本已下载完成",
                                            "立即安装~",
                                            () => {
                                              t.fn && t.fn();
                                            },
                                          )
                                        : "not" == t.type &&
                                          e &&
                                          o(
                                            t.msg || "当前已经是最新版~",
                                            () => {},
                                          );
                                }));
                            }),
                              setTimeout(() => {
                                global.UpDateProgram();
                              }, 8e3));
                          } else "close" == o.event && n.close();
                        },
                        "html_bus-main_move": (e, t) => {
                          doMovePosition(t);
                        },
                        "html_bus-main_getFocus": (e, t) => {},
                        "html_bus-main_mouseIgnore": (e, o) => {
                          n.setMouseIgnore(t, !!o?.ignore);
                        },
                        "html_bus-main_mouseHitResult": (e, o) => {
                          if (
                            o?.id &&
                            o.id != n.mouseHitRequestId
                          )
                            return;
                          o?.visible && n.setMouseIgnore(t, !1);
                        },
                        "html_bus-main_mouseHotArea": (e, t) => {
                          n.mouseHotArea = t?.visible ? t : null;
                        },
                        "html_bus-main_mouse": (e, t) => {
                          if (!n.isStop())
                            if ("which" == t.type) {
                              if (control.show && t?.data?.isDown) {
                                if (
                                  ("normal" == n.petState ||
                                    "sick" == n.petState) &&
                                  getPetInfoOne("health", "info") &&
                                  getChance(0.2)
                                ) {
                                  let e = getRandom(5, 20);
                                  e < 1e3 &&
                                    ((e = +getPetInfoOne("mood", "info") + e),
                                    e > 1e3 && (e = 1e3),
                                    setPetInfo({ info: { mood: e } }),
                                    openSpeak({
                                      data: { type: "text" },
                                      communication: ["toHeartTolk"],
                                      nextActiveStr: "speak",
                                    }));
                                }
                                control.changeState({ type: "menu" });
                              }
                            } else if ("rightClick" == t.type)
                              rightMenu.show
                                ? rightMenu.doClose()
                                : rightMenu.cleate({
                                    nowPosition: [
                                      n.nowPosition[0] + t.data.clientX,
                                      n.nowPosition[1] + t.data.clientY,
                                    ],
                                    msg: "msg fo rightMenu is rightClick",
                                    positionType: "followMain",
                                  });
                            else if (
                              "roller" == t.type &&
                              (console.log(t, n.petState),
                              "normal" == n.petState || "sick" == n.petState) &&
                              getPetInfoOne("health", "info") &&
                              getChance(0.2)
                            ) {
                              let e = getRandom(5, 20);
                              e < 1e3 &&
                                ((e = +getPetInfoOne("mood", "info") + e),
                                e > 1e3 && (e = 1e3),
                                setPetInfo({ info: { mood: e } }),
                                openSpeak({
                                  data: { type: "text" },
                                  communication: ["toHeartTolk"],
                                  nextActiveStr: "speak",
                                }));
                            }
                        },
                        "html_bus-main_backPetLoadFinish": (e, t) => {
                          let o = t.data;
                          try {
                            o = JSON.parse(o);
                          } catch (e) {}
                          "finish" != t.event ||
                          ("exit" != o && "exit" != o?.finish)
                            ? (getSys("doNotDisturb") && !o?.mustSpeak) ||
                              ("speak" == t.type &&
                                o &&
                                n.openSpeak({
                                  data: o,
                                  otherOpt: t?.otherOpt || null,
                                }))
                            : app.exit([!0]);
                        },
                        main_h_setPetState_m: (e, t) => {
                          try {
                            t.data = JSON.parse(t.data);
                          } catch (e) {}
                          if (
                            ((n.petState = t?.data?.name || "loadIng"),
                            t.data?.tolkName)
                          ) {
                            const _tn = t.data.tolkName;
                            const _emit = (rec) => {
                              if (!rec) return;
                              t.data?.tolkActive
                                ? openSpeak({
                                    data: {
                                      type: "text",
                                      data: rec.tolk || "出错了~~~",
                                      submitText: rec.submitText || "",
                                    },
                                    active: t?.data?.tolkActive || "",
                                    otherOpt:
                                      "speak" == t.data?.tolkActive &&
                                      "smallTalk" == _tn
                                        ? { mood: getRandom(5, 20) }
                                        : "",
                                  })
                                : n.openSpeak({
                                    data: {
                                      type: "text",
                                      data: rec.tolk || "出错了~~~",
                                      submitText: rec.submitText || "",
                                    },
                                    mustUnShow: !0,
                                  });
                            };
                            let _cached = null;
                            if (
                              getSys("llmEnabled") &&
                              ("smallTalk" === _tn || "toHeartTolk" === _tn)
                            ) {
                              _cached = llmService.dequeue(_tn);
                              llmService.prefetch(_tn, getPetInfo());
                            }
                            if (_cached) return _emit(_cached);
                            if (
                              getSys("llmEnabled") &&
                              getSys("llmApiKey") &&
                              ("enter" === _tn || "levUp" === _tn)
                            ) {
                              return llmService
                                .generateOnce(
                                  _tn,
                                  _buildLLMCtx(_tn),
                                  getPetInfo(),
                                )
                                .then((r) =>
                                  _emit(
                                    r?.tolk ? r : getCommunication(_tn || ""),
                                  ),
                                );
                            }
                            _emit(getCommunication(_tn || ""));
                          }
                        },
                      }),
                      petControl?.changePetInfoReply &&
                        petControl.changePetInfoReply(getPetInfo()),
                      s([
                        {
                          event: "pet",
                          name: n.name,
                          fn: (e) => {
                            n.isStop() ||
                              (t.webContents.send("main_bus-html_setPet", e),
                              petControl?.changePetInfoReply &&
                                petControl.changePetInfoReply(e),
                              e?.changeInfo &&
                                ((e?.changeInfo?.host || e?.changeInfo?.name) &&
                                  n.menu?.setTrayToolTip(
                                    e.info.host + "家的" + e.info.name,
                                  ),
                                e?.changeInfo?.addmood &&
                                  t.webContents.send("main_m_setFloat_h", {
                                    type: "seeFloat",
                                    data: {
                                      num: e.changeInfo.addmood,
                                      time: 800,
                                    },
                                  })));
                          },
                        },
                        {
                          event: "system",
                          name: n.name,
                          fn: (e) => {
                            if (e?.isCHange?.label) {
                              let t = "";
                              ("doNotDisturb" == e.isCHange.label &&
                                (t = e.isCHange.value
                                  ? getCommunication("sys", "doNotDisturbOFF")
                                  : getCommunication("sys", "doNotDisturbNO")),
                                t &&
                                  openSpeak({
                                    data: {
                                      type: "text",
                                      data: t?.tolk || "",
                                      submitText: t?.submitText || "",
                                      mustSpeak: !0,
                                    },
                                    nextActiveStr: "speak",
                                  }));
                            }
                          },
                        },
                      ]),
                      (clipboardWatcherMain = clipboardWatcher({
                        watchDelay: 200,
                        shakeTime: 300,
                        stop: n.isStop,
                        onTextChange: (e) => {
                          const _fb = () =>
                            openSpeak({
                              data: {
                                type: "text",
                                data: e,
                                submitText: "当前复制的文字",
                                form: "clip",
                              },
                            });
                          if (getSys("llmEnabled") && getSys("llmApiKey")) {
                            const _t =
                              e.length > LLM_MAX_CLIPBOARD_LEN
                                ? e.slice(0, LLM_MAX_CLIPBOARD_LEN) + "..."
                                : e;
                            llmService
                              .generateOnce("clipboardText", _t, getPetInfo())
                              .then((r) => {
                                if (r?.tolk)
                                  openSpeak({
                                    data: {
                                      type: "text",
                                      data: r.tolk,
                                      submitText: r.submitText || "嗯",
                                      form: "clip",
                                    },
                                  });
                                else _fb();
                              });
                          } else _fb();
                        },
                        onImageChange: (e) => {
                          (e?.toDataURL && (e = e.toDataURL()),
                            openSpeak({
                              data: {
                                type: "img",
                                data: e,
                                submitText: "当前复制的图片",
                                form: "clip",
                              },
                            }));
                        },
                      })));
                  },
                  onload(e) {
                    (console.log("onload ", this.name),
                      (n.menu = new MenuCreate()));
                    let t = [
                      {
                        on: "click",
                        Fn: (e) => {
                          n.isStop() ||
                            (stateInfo.show
                              ? stateInfo.doClose()
                              : stateInfo.cleate({
                                  nowPosition: [e.bounds.x, e.bounds.y],
                                  msg: "msg fo stateInfo",
                                }));
                        },
                      },
                      {
                        on: "right-click",
                        Fn: (e) => {
                          n.isStop() ||
                            (rightMenu.show
                              ? rightMenu.doClose()
                              : rightMenu.cleate({
                                  nowPosition: [e.bounds.x, e.bounds.y],
                                  msg: "msg fo rightMenu is trays",
                                }));
                        },
                      },
                    ];
                    (n.menu.addTrays(t),
                      n.menu?.activeTraysIcon &&
                        i &&
                        n.menu?.activeTraysIcon(i),
                      i && (i = null));
                    let o = null;
                    ((global.addGoods = (e, t) => {
                      let o = global.petControl.Goods.getOurGoods(e),
                        n = o[getRandom(o.length - 1)];
                      (console.log(n),
                        t && t(n),
                        global.petControl.Goods.toAddGoods({ good: n }));
                    }),
                      (shotycutsMain = new Shotycuts({
                        vm: e,
                        mainShortcutKeys: (e) => ({
                          manyFn: [
                            {
                              code: ["Ctrl+Shift+numdiv"],
                              fn: () => {
                                (console.log("食物"), addGoods("commodity"));
                              },
                            },
                            {
                              code: ["Ctrl+Shift+nummult"],
                              fn: () => {
                                (console.log("清洁"), addGoods("food"));
                              },
                            },
                            {
                              code: ["Ctrl+Shift+numsub"],
                              fn: () => {
                                (console.log("药品"), addGoods("medicine"));
                              },
                            },
                            {
                              code: ["Ctrl+Shift+numadd"],
                              fn: () => {
                                petControl.Goods.cleanOurStoreGoods();
                              },
                            },
                            {
                              code: ["Ctrl+Shift+2"],
                              fn: () => {
                                let e = +getPetInfoOne("growth", "info") + 5e3;
                                setPetInfo({ info: { growth: e } });
                              },
                            },
                            {
                              code: ["Ctrl+Shift+1"],
                              fn: () => {
                                let e = +getPetInfoOne("growth", "info") - 5e3;
                                (e < 0 && (e = 0),
                                  (e <= 0 && +e != +e) ||
                                    setPetInfo({ info: { growth: e } }));
                              },
                            },
                            {
                              code: ["Ctrl+Shift+3"],
                              fn: () => {
                                let e = +getPetInfoOne("yb", "info") + 100;
                                setPetInfo({ info: { yb: e } });
                              },
                            },
                            {
                              code: ["Ctrl+Shift+4"],
                              fn: () => {
                                let e = +getPetInfoOne("yb", "info") - 100;
                                (e < 0 && (e = 0),
                                  (e <= 0 && +e != +e) ||
                                    setPetInfo({ info: { yb: e } }));
                              },
                            },
                            {
                              code: [
                                "Ctrl+Up",
                                "Ctrl+Down",
                                "Ctrl+Left",
                                "Ctrl+Right",
                              ],
                              fn: () => {
                                if (o) return;
                                o = setTimeout(() => {
                                  o = null;
                                }, 5e3);
                                const _fb = () =>
                                  openSpeak({
                                    data: { type: "text" },
                                    communication: ["god"],
                                    nextActiveStr: "speak",
                                  });
                                if (getSys("llmEnabled") && getSys("llmApiKey"))
                                  llmService
                                    .generateOnce("godMode", null, getPetInfo())
                                    .then((r) => {
                                      r?.tolk
                                        ? openSpeak({
                                            data: {
                                              type: "text",
                                              data: r.tolk,
                                              submitText: r.submitText || "哦",
                                            },
                                            nextActiveStr: "speak",
                                          })
                                        : _fb();
                                    });
                                else _fb();
                              },
                            },
                          ],
                          unSet: e,
                        }),
                      }).init()));
                    let a = ["floatStyle"];
                    for (let e in a) getSys(a[e]) && toolWindow[a[e]].cleate();
                    (shotycutsMain.upShotycut(
                      "controlTool",
                      ["ALT", "ESC"],
                      () => {
                        toolWindow.floatStyle.show &&
                          (toolWindow.floatStyle.doClose(),
                          setSys({ name: "floatStyle", value: !1 }));
                      },
                    ),
                      shotycutsMain.upShotycut(
                        "controlTool",
                        ["ALT", "SHIFT", "CTRL", "R"],
                        () => {
                          if (!n.isStop() && !n.reLoad) {
                            n.menu?.destroyTray && n.menu.destroyTray();
                            for (let e in windowsMain.wins)
                              if (
                                "main" != e &&
                                windowsMain.wins[e]?.win?.close
                              )
                                try {
                                  windowsMain.wins[e].win.close();
                                } catch (e) {}
                            (setTimeout(() => {
                              e.webContents.reload();
                            }, 100),
                              (n.reLoad = setTimeout(() => {
                                n.reLoad = !1;
                              }, 2e3)));
                          }
                        },
                      ),
                      (global.shotycutsMain = shotycutsMain),
                      (global.changeShotycuts = (e) => {
                        let { type: t, name: o, key: n } = e;
                        if (o && n)
                          return "upData" == t
                            ? shotycutsMain.upDataShotycut(o, n)
                            : void 0;
                      }));
                  },
                  onshow(e) {
                    (console.log("onshow ", this.name),
                      (n.window = e),
                      (n.show = !0));
                  },
                  onhide() {
                    (console.log("onhide ", this.name), (n.show = !1));
                  },
                  onclose() {
                    (n.stopMouseHitWatch(), console.log("onclose ", this.name));
                  },
                })
                .then((e) => {
                  ((this.window = e), this.init());
                })
                .catch((e) => {
                  console.log(e);
                }));
          }
          init() {
            this.show = !0;
          }
          doClose() {
            (this.window.close(), (this.window = null), (this.show = !1));
          }
          openSpeak(e) {
            let { data: t, mustUnShow: o, otherOpt: n } = e;
            if (tip.show) {
              if (o) return;
              tip.setMsg({ data: t, otherOpt: n });
            } else
              tip.cleate({
                position: this.nowPosition,
                maxSize: this.maxSize,
                data: t,
                otherOpt: n,
              });
          }
          isStop(e) {
            return "clip" == e ? !getSys("clip") : this.wellClose;
          }
          appear() {
            (!this.show && this.window.show(),
              !this.window.isAlwaysOnTop() && this.window.setAlwaysOnTop(!0),
              (this.show = !0));
          }
        }
        let main = new mainClass();
        module.exports = main;
      },
    },
    __webpack_module_cache__ = {};
  function __webpack_require__(e) {
    var t = __webpack_module_cache__[e];
    if (void 0 !== t) return t.exports;
    var o = (__webpack_module_cache__[e] = { exports: {} });
    return (
      __webpack_modules__[e](o, o.exports, __webpack_require__),
      o.exports
    );
  }
  var __webpack_exports__ = __webpack_require__(953);
  module.exports = __webpack_exports__;
})();
