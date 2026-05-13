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
      mouseHitRaf: null,
      mouseIgnoreState: null,
      mouseHitPadding: 4,
      mouseHitLeaveDelay: 160,
      mouseHitLeaveTimer: null,
      mouseHotArea: null,
      mouseHotAreaKey: "",
      lastMouseHitEvent: null,
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
        this.initPixelMouseHitTest(),
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
              }),
              setTimeout(() => {
                this.updateMouseHotArea && this.updateMouseHotArea();
              }, 80));
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
      /** 初始化企鹅轮廓命中检测，让远离企鹅的透明区域点击穿透到桌面。 */
      initPixelMouseHitTest() {
        if (!window.electronAPI?.html_ToMain_mouseIgnore) return;
        document.addEventListener("mousemove", (t) => {
          this.schedulePixelMouseHitTest(t);
        });
        window.electronAPI.main_ToHtml_checkMouseHit &&
          window.electronAPI.main_ToHtml_checkMouseHit((t, e) => {
            let i = this.isPetPixelVisible(e.clientX, e.clientY);
            (window.electronAPI.html_ToMain_mouseHitResult({
              id: e.id,
              visible: i,
            }),
              i && this.setMouseIgnore(!1));
          });
        setTimeout(() => {
          this.updateMouseHotArea();
        }, 500);
      },
      /** 使用 requestAnimationFrame 合并 mousemove，避免每个事件都读取像素。 */
      schedulePixelMouseHitTest(t) {
        ((this.lastMouseHitEvent = t),
          this.mouseHitRaf ||
            (this.mouseHitRaf = requestAnimationFrame(() => {
              let t = this.lastMouseHitEvent;
              ((this.mouseHitRaf = null),
                this.updateMouseHotArea(),
                t &&
                  this.setMouseIgnore(
                    !this.isPetPixelVisible(t.clientX, t.clientY),
                  ));
            })));
      },
      /** 通知主进程切换鼠标穿透状态；进入穿透前加短延迟，避免边缘抖动导致难点击。 */
      setMouseIgnore(t) {
        if (this.curState) t = !1;
        if (!t) {
          (this.mouseHitLeaveTimer &&
            (clearTimeout(this.mouseHitLeaveTimer),
            (this.mouseHitLeaveTimer = null)),
            this.applyMouseIgnore(!1));
          return;
        }
        if (this.mouseIgnoreState || this.mouseHitLeaveTimer) return;
        this.mouseHitLeaveTimer = setTimeout(() => {
          ((this.mouseHitLeaveTimer = null), this.applyMouseIgnore(!0));
        }, this.mouseHitLeaveDelay);
      },
      /** 立即应用鼠标穿透状态，避免重复 IPC。 */
      applyMouseIgnore(t) {
        this.mouseIgnoreState !== t &&
          ((this.mouseIgnoreState = t),
          window.electronAPI.html_ToMain_mouseIgnore({ ignore: t }));
      },
      /** 获取 Ruffle 实际渲染区域，几何命中只依赖区域尺寸，不读取像素颜色。 */
      getPetCanvas() {
        let t =
          this.swfPet?.swf?.dom ||
          document.querySelector("ruffle-player") ||
          document.getElementById("pet");
        if (!t) return null;
        if ("canvas" == (t.tagName || "").toLowerCase()) return t;
        return (
          t.shadowRoot?.querySelector("canvas") ||
          t.querySelector?.("canvas") ||
          document.querySelector("ruffle-player canvas")
        );
      },
      /** 判断点是否落在旋转椭圆内，用多个椭圆组合出 QQ 企鹅轮廓。 */
      isInEllipse(t, e, i, o, n, s, r = 0) {
        let a = Math.cos(r),
          l = Math.sin(r),
          h = t - i,
          m = e - o,
          c = h * a + m * l,
          d = -h * l + m * a;
        return (c * c) / (n * n) + (d * d) / (s * s) <= 1;
      },
      /**
       * Hide_left / Hide_right 时 SWF 把企鹅画向画布一侧；用水平偏移把椭圆轮廓平移到与造型一致。
       * 数值略大于理论值，避免「靠边露脸」时仍落在中间可点区。
       */
      getPenguinHitOffsetX() {
        return "left" == this.position
          ? -0.26
          : "right" == this.position
            ? 0.26
            : 0;
      },
      /** 企鹅形象的语义命中：头、身体、翅膀、脚都可点，不受黑白背景影响。 */
      isInPenguinShape(t, e, i, o = 0) {
        let n = Math.max(0.01, i / 200),
          s = t - o,
          // 头顶：圆心略下移、纵半径收短，减少「头发/头顶」上方空白误触
          r = [
            [0.5, 0.485, 0.148 + n, 0.09 + n, 0],
            [0.5, 0.593, 0.218 + n, 0.132 + n, 0],
            [0.5, 0.685, 0.175 + n, 0.182 + n, 0],
            [0.5, 0.765, 0.218 + n, 0.135 + n, 0],
            [0.34, 0.665, 0.048 + n, 0.152 + n, -0.45],
            [0.66, 0.665, 0.048 + n, 0.152 + n, 0.45],
            [0.4, 0.895, 0.086 + n, 0.034 + n * 0.35, -0.08],
            [0.6, 0.895, 0.086 + n, 0.034 + n * 0.35, 0.08],
          ];
        for (let t of r)
          if (this.isInEllipse(s, e, t[0], t[1], t[2], t[3], t[4])) return !0;
        return !1;
      },
      /** 粗筛矩形：居中时对称；靠墙露脸时左右侧削掉大块空白，避免「没企鹅也能点」。 */
      getPenguinHotArea(t, e = 0) {
        let i = this.mouseHitPadding,
          o = 0.3,
          n = 0.7,
          s = 0.33,
          r = 0.89;
        e > 0.01 && ((o = 0.38), (s = 0.355));
        e < -0.01 && ((n = 0.62), (s = 0.355));
        let a = o + e,
          l = n + e;
        return {
          visible: !0,
          shape: "penguin",
          rectLeft: t.left,
          rectTop: t.top,
          rectWidth: t.width,
          rectHeight: t.height,
          padding: i,
          hitOffsetX: e,
          left: Math.max(0, t.left + t.width * a - i),
          top: Math.max(0, t.top + t.height * s - i),
          right: t.left + t.width * l + i,
          bottom: t.top + t.height * r + i,
        };
      },
      /** 把企鹅几何热区同步给主进程缓存。 */
      updateMouseHotArea() {
        if (!window.electronAPI?.html_ToMain_mouseHotArea) return null;
        let t = this.getPetCanvas();
        if (!t) return null;
        let e = t.getBoundingClientRect();
        if (!e.width || !e.height) {
          (this.mouseHotAreaKey = "",
            (this.mouseHotArea = null),
            window.electronAPI.html_ToMain_mouseHotArea({ visible: !1 }));
          return null;
        }
        let i = this.getPenguinHitOffsetX(),
          o = this.getPenguinHotArea(e, i),
          n = [
            Math.round(o.left),
            Math.round(o.top),
            Math.round(o.right),
            Math.round(o.bottom),
            i.toFixed(3),
          ].join(",");
        return (
          (this.mouseHotArea = o),
          n != this.mouseHotAreaKey &&
            ((this.mouseHotAreaKey = n),
            window.electronAPI.html_ToMain_mouseHotArea(o)),
          o
        );
      },
      /** 根据 QQ 企鹅形象判断鼠标是否落在可交互区域。 */
      isPetPixelVisible(t, e) {
        if (this.curState) return !0;
        let i = this.getPetCanvas();
        if (!i) return !0;
        let o = i.getBoundingClientRect();
        if (!o.width || !o.height) return !0;
        let n = this.getPenguinHitOffsetX(),
          s = this.updateMouseHotArea();
        if (
          s &&
          t >= s.left &&
          e >= s.top &&
          t <= s.right &&
          e <= s.bottom
        ) {
          let i = (t - o.left) / o.width,
            r = (e - o.top) / o.height;
          return this.isInPenguinShape(i, r, this.mouseHitPadding, n);
        }
        return !1;
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
          let e = this.position;
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
          e != this.position &&
            this.$nextTick(() => {
              this.updateMouseHotArea && this.updateMouseHotArea();
            });
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
