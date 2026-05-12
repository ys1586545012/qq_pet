// Vue page source restored from the packaged app; template, IPC and asset paths are kept unchanged.
// Page path: src/windows/main/index.js
(() => {
  var t = {},
    e = (t) => {
      window.electronAPI.html_ToMain(t);
    };
  window.RufflePlayer = window.RufflePlayer || {};
  const i = {
    data: () => ({
      nowPosition: "",
      position: "center",
      maxSize: [144, 144],
      sizeStyle: { width: "144px", height: "144px" },
      loads: !1,
      petContent: null,
      petInfo: { info: {}, maxInfo: {}, activeOption: {}, otherOptions: {} },
      petControl: null,
      curState: !1,
      draggingFall: !1,
      fallHoldTimer: null,
      fallMoveThreshold: 6,
      swfPet: null,
      floatArr: [],
    }),
    watch: {
      maxSize: {
        handler(t, e) {
          ((this.sizeStyle = { width: t[0] + "px", height: t[1] + "px" }),
            this.setMainPosition([0, 0]));
        },
        deep: !0,
      },
    },
    computed: {},
    created() {
      window.addEventListener(
        "message",
        (t) => {
          console.log("res father:>> ", t);
        },
        !1,
      );
    },
    mounted() {
      ((this.loads = !0),
        this.initPet(),
        this.doMove(),
        this.getNowPosition(),
        window.electronAPI.main_ToHtml((t, e) => {
          if ("load" == e.type) {
            (e.bd && seeApp(),
              (this.petInfo = e.petInfo),
              (this.maxSize = e.maxSize));
            let t = [
              e.nowPosition[0] - +this.petInfo.info.lastX,
              e.nowPosition[1] - +this.petInfo.info.lastY,
            ];
            (this.setMainPosition(t),
              this.swfPet.init &&
                this.swfPet.init({
                  state: this.petInfo,
                  baseRouter: e.bd ? "../assets/Action" : "../../assets/Action",
                }));
          }
        }),
        window.electronAPI.main_ToHtml_setSay((t, e) => {
          try {
            e = JSON.parse(e);
          } catch {}
          for (let t in e) console.log(e[t]);
        }),
        window.electronAPI.main_ToHtml_setPet((t, e) => {
          ((this.petInfo = e),
            this.swfPet.setPetState && this.swfPet.setPetState(e));
        }),
        window.electronAPI.main_ToHtml_active((t, e) => {
          (this.swfPet.changeSwf &&
            this.swfPet.changeSwf(e.active, {
              load: () => {
                e.load &&
                  window.electronAPI.html_ToMain_backPetLoadFinish({
                    type: e?.type || null,
                    data: e.load,
                    event: "load",
                    otherOpt: e.otherOpt || null,
                  });
              },
              finish: () => {
                e.finish &&
                  window.electronAPI.html_ToMain_backPetLoadFinish({
                    type: e?.type || null,
                    data: e.finish,
                    event: "finish",
                    otherOpt: e.otherOpt || null,
                  });
              },
            }),
            window.electronAPI.html_ToMain_getFocus());
        }),
        window.electronAPI.main_m_nextActive((t, e) => {
          let i = !0;
          if (e?.data)
            try {
              i = JSON.parse(e.data);
            } catch {}
          this.swfPet.doNext && this.swfPet.doNext(i);
        }),
        window.electronAPI.main_m_setFloat((t, e) => {
          "seeFloat" == e.type && this.seeFloat(e.data);
        }),
        e({ event: "mounted" }));
    },
    methods: {
      seeFloat(t) {
        t?.num &&
          (this.floatArr.push({
            id: Math.round(4e3 * Math.random() + 100),
            icon: "laugh",
            type: "addMood",
            nums: (t.num + "").split(""),
          }),
          setTimeout(() => {
            this.floatArr.shift();
          }, t?.time || 200));
      },
      clickPet(t) {
        console.log("e :>> ", t);
      },
      initPet(t) {
        this.swfPet = new swfPet({
          id: "pet",
          goNormal: this.goNormal,
          backFn: (t) => {
            (console.log("e", t),
              window.electronAPI.main_h_setPetState({
                type: "setState",
                data: JSON.stringify(t),
              }));
          },
        });
      },
      goNormal() {
        return "left" == this.position
          ? "hideleft"
          : "right" == this.position
            ? "hideright"
            : "center" == this.position
              ? "normal"
              : void 0;
      },
      setMainPosition(t, e = {}) {
        window.electronAPI.html_ToMain_move({
          next: t,
          maxSize: [...this.maxSize],
          notChangeSize: e.changeSize || this.notChangeSize || !1,
        });
      },
      /** 清理长按触发计时器，避免普通点击误触发 Fall.swf。 */
      clearFallHoldTimer() {
        this.fallHoldTimer &&
          (clearTimeout(this.fallHoldTimer), (this.fallHoldTimer = null));
      },
      /** 触发拖拽摔落动作，移动超过阈值或长按时调用。 */
      startFallAnimation() {
        if (this.draggingFall) return;
        this.draggingFall = !0;
        this.swfPet.doNext && this.swfPet.doNext("fall");
        this.swfPet.changeSwf && this.swfPet.changeSwf("fall");
      },
      async doMove() {
        this.moveOut = new move({
          id: "move",
          contextmenu: () => {
            this.isClosed;
          },
          mousedown: (t) => {
            1 == t.which
              ? ((this.curState = !0),
                this.clearFallHoldTimer(),
                (this.fallHoldTimer = setTimeout(() => {
                  this.curState && this.startFallAnimation();
                }, 350)),
                window.electronAPI.html_ToMain_mouse({
                  data: t,
                  type: "which",
                }))
              : 2 == t.which
                ? window.electronAPI.html_ToMain_mouse({ type: "roller" })
                : 3 == t.which &&
                  window.electronAPI.html_ToMain_mouse({
                    data: { ...t, clientX: t.clientX, clientY: t.clientY },
                    type: "rightClick",
                  });
          },
          mousemove: (t, e) => {
            if (e.next && !this.draggingFall) {
              let t = Math.hypot(e.next[0] || 0, e.next[1] || 0);
              // 只有移动超过阈值才算拖拽，过滤点击时的微小抖动。
              t >= this.fallMoveThreshold && this.startFallAnimation();
            }
            (e.next && this.setMainPosition(e.next),
              window.electronAPI.html_ToMain_mouse({ data: t, type: "move" }));
          },
          mouseup: (t, e) => {
            (this.clearFallHoldTimer(),
              e.isDown &&
                (this.draggingFall
                  ? this.swfPet.forceChangeSwf && this.swfPet.forceChangeSwf()
                  : this.swfPet.changeSwf()),
              (this.draggingFall = !1),
              (this.curState = !1),
              window.electronAPI.html_ToMain_mouse({ data: e, type: "which" }));
          },
          mouseout: (t, e) => {},
        }).init();
        let t = this.moveOut.getSize()[0];
        this.maxSize = [t, t];
      },
      /**
       * 同步主窗口坐标；根据虚拟桌面工作区包围盒判断贴近左/右边缘（适配多屏与负坐标）。
       * @param {*} event IPC event
       * @param {number[]} position 宠物窗口左上角 [x, y]
       * @param {number[]} span [桌面 X 跨度, 桌面 Y 跨度]（兼容旧逻辑）
       * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bounds 工作区包围盒
       */
      getNowPosition() {
        window.electronAPI.main_ToHtml_setPotision((event, position, span, bounds) => {
          this.nowPosition = position;
          if (
            bounds &&
            typeof bounds.minX === "number" &&
            typeof bounds.maxX === "number"
          ) {
            this.position =
              position[0] <= bounds.minX + 3
                ? "left"
                : position[0] >= bounds.maxX - this.maxSize[0] - 3
                  ? "right"
                  : "center";
          } else {
            this.position =
              position[0] <= 3
                ? "left"
                : position[0] >= +span[0] - +this.maxSize[0] - 3
                  ? "right"
                  : "center";
          }
        });
      },
      closeWindow() {
        e({ event: "close" });
      },
    },
  };
  Vue.createApp(i).mount("#app");
  var o = window;
  for (var n in t) o[n] = t[n];
  t.__esModule && Object.defineProperty(o, "__esModule", { value: !0 });
})();
