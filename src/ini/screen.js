const { screen } = require("electron");

/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

/** 缓存的工作区快照（所有显示器 workArea 列表 + 整体包围盒）。 */
let cachedSnapshot = null;

/** 主显示器工作区宽高 [width, height]，供仅需单屏尺寸的旧代码使用。 */
let primaryDisplaySize = [0, 0];

/** 显示器布局变化时的订阅回调（主进程内）。 */
const workspaceChangeListeners = new Set();

/**
 * 判断两个轴对齐矩形是否相交。
 * @param {number} ax 矩形 A 左上角 x
 * @param {number} ay 矩形 A 左上角 y
 * @param {number} aw 矩形 A 宽
 * @param {number} ah 矩形 A 高
 * @param {Rect} b 矩形 B（workArea）
 */
function overlaps(ax, ay, aw, ah, b) {
  return (
    ax < b.x + b.width &&
    ax + aw > b.x &&
    ay < b.y + b.height &&
    ay + ah > b.y
  );
}

/**
 * 根据 Electron 当前显示器列表构建工作区快照。
 * 使用各屏 workArea（扣除任务栏等区域），坐标系为虚拟桌面坐标（可含负数）。
 */
function computeWorkspaceSnapshot() {
  const displays = screen.getAllDisplays();
  if (!displays.length) {
    primaryDisplaySize = [1920, 1080];
    cachedSnapshot = {
      minX: 0,
      minY: 0,
      maxX: 1920,
      maxY: 1080,
      workRects: [{ x: 0, y: 0, width: 1920, height: 1080 }],
    };
    return cachedSnapshot;
  }

  const primary = screen.getPrimaryDisplay();
  primaryDisplaySize = [
    primary.workArea.width,
    primary.workArea.height,
  ];

  /** @type {Rect[]} */
  const workRects = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const d of displays) {
    const wa = d.workArea;
    workRects.push({
      x: wa.x,
      y: wa.y,
      width: wa.width,
      height: wa.height,
    });
    minX = Math.min(minX, wa.x);
    minY = Math.min(minY, wa.y);
    maxX = Math.max(maxX, wa.x + wa.width);
    maxY = Math.max(maxY, wa.y + wa.height);
  }

  cachedSnapshot = {
    minX,
    minY,
    maxX,
    maxY,
    workRects,
  };
  return cachedSnapshot;
}

/**
 * 当包围盒内存在「缝隙」（对角摆放显示器时）时，将窗口吸附到最近的单个显示器工作区内。
 * @param {number} x 候选左上角 x
 * @param {number} y 候选左上角 y
 * @param {number} ww 窗口宽
 * @param {number} wh 窗口高
 * @param {Rect[]} workRects 各屏 workArea
 * @returns {[number, number]} 吸附后的左上角坐标
 */
function snapToNearestWorkArea(x, y, ww, wh, workRects) {
  let bestX = x;
  let bestY = y;
  let bestDist = Infinity;
  for (const w of workRects) {
    const maxLX = w.x + w.width - ww;
    const maxLY = w.y + w.height - wh;
    const lx = Math.min(Math.max(x, w.x), Math.max(w.x, maxLX));
    const ly = Math.min(Math.max(y, w.y), Math.max(w.y, maxLY));
    const d = (lx - x) ** 2 + (ly - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestX = lx;
      bestY = ly;
    }
  }
  return [bestX, bestY];
}

/** 丢弃缓存，便于分辨率变化或显示器增减后重新采样。 */
function invalidateWorkspaceSnapshot() {
  cachedSnapshot = null;
}

/**
 * 获取工作区快照（包围盒 + 各屏矩形）。
 * @param {boolean} force 是否强制刷新
 */
function getWorkspaceSnapshot(force = false) {
  if (!cachedSnapshot || force) computeWorkspaceSnapshot();
  return cachedSnapshot;
}

/**
 * 兼容旧代码：返回虚拟桌面在 X/Y 方向的跨度 [widthSpan, heightSpan]，
 * 或主显示器工作区尺寸（primaryOnly 为 true 时）。
 *
 * 说明：旧实现把多屏宽高各自相加，与坐标系不匹配；现改为包围盒跨度，
 * 与 clampPositionToWorkspace 使用同一套几何语义。
 *
 * @param {boolean} force 是否强制重新计算
 * @param {boolean} primaryOnly 是否只返回主屏工作区宽高
 */
global.getScreenSize = (force = false, primaryOnly = false) => {
  if (primaryOnly) {
    getWorkspaceSnapshot(force);
    return [...primaryDisplaySize];
  }
  const s = getWorkspaceSnapshot(force);
  return [s.maxX - s.minX, s.maxY - s.minY];
};

/**
 * 返回当前所有显示器工作区的轴对齐包围盒（虚拟桌面坐标）。
 * @param {boolean} force 是否强制刷新
 */
global.getWorkspaceBounds = (force = false) => {
  const s = getWorkspaceSnapshot(force);
  return {
    minX: s.minX,
    minY: s.minY,
    maxX: s.maxX,
    maxY: s.maxY,
  };
};

/**
 * 将宠物窗口左上角限制在可用工作区内，并处理多屏缝隙与超大窗口等边界情况。
 *
 * 算法步骤：
 * 1. 用所有 workArea 的最小外接矩形做轴对齐裁剪（适配扩展屏、负坐标主屏布局）。
 * 2. 若裁剪后窗口与任一显示器工作区都不相交（例如落在两屏对角形成的空隙），
 *    则在单个显示器内再做最近吸附。
 *
 * @param {number} x 窗口左上角 x（Electron 屏幕坐标）
 * @param {number} y 窗口左上角 y
 * @param {number} winWidth 窗口宽度（应与宠物展示尺寸一致）
 * @param {number} winHeight 窗口高度
 * @param {boolean} forceMetrics 是否在本帧强制刷新显示器几何信息
 * @returns {{ x: number, y: number, dx: number, dy: number }} 裁剪后的坐标及相对位移
 */
global.clampPositionToWorkspace = (
  x,
  y,
  winWidth,
  winHeight,
  forceMetrics = false,
) => {
  const s = getWorkspaceSnapshot(forceMetrics);
  const maxLX = s.maxX - winWidth;
  const maxLY = s.maxY - winHeight;

  let nx = Math.min(Math.max(x, s.minX), Math.max(s.minX, maxLX));
  let ny = Math.min(Math.max(y, s.minY), Math.max(s.minY, maxLY));

  const intersects = s.workRects.some((w) =>
    overlaps(nx, ny, winWidth, winHeight, w),
  );

  if (!intersects) {
    [nx, ny] = snapToNearestWorkArea(nx, ny, winWidth, winHeight, s.workRects);
  }

  return {
    x: nx,
    y: ny,
    dx: nx - x,
    dy: ny - y,
  };
};

/**
 * 订阅工作区几何变化（显示器插拔、分辨率/DPI、任务栏变更等）。
 * @param {(bounds: ReturnType<typeof global.getWorkspaceBounds>) => void} fn
 * @returns {() => void} 取消订阅
 */
global.subscribeWorkspaceChange = (fn) => {
  workspaceChangeListeners.add(fn);
  return () => workspaceChangeListeners.delete(fn);
};

function notifyWorkspaceChanged() {
  invalidateWorkspaceSnapshot();
  computeWorkspaceSnapshot();
  const bounds = global.getWorkspaceBounds(false);
  for (const fn of workspaceChangeListeners) {
    try {
      fn(bounds);
    } catch (err) {
      console.error("[screen] workspace listener:", err);
    }
  }
}

screen.on("display-added", notifyWorkspaceChanged);
screen.on("display-removed", notifyWorkspaceChanged);
screen.on("display-metrics-changed", notifyWorkspaceChanged);

computeWorkspaceSnapshot();

module.exports = {};
