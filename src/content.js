"use strict";

// モードはページの sessionStorage に置く。sessionStorage はタブごとに別で、
// Firefox がタブを復元すると（再起動後も）一緒に戻る。これで権限を要求せずに
// 「タブごとに覚えておく」ができる。
const KEY = "ni225simple-mode";
const MODES = ["all", "chart", "other"];
const root = document.documentElement;
const CHART_SELECTOR = "#chartTBL";

function loadMode() {
  try {
    const mode = sessionStorage.getItem(KEY);
    return MODES.includes(mode) ? mode : "all";
  } catch {
    return "all";
  }
}

function saveMode(mode) {
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    // 保存できなくても、今の表示には効かせる
  }
}

function applyMode(mode) {
  if (mode === "chart" || mode === "other") {
    root.setAttribute("data-ni225-mode", mode);
  } else {
    root.removeAttribute("data-ni225-mode");
  }
  // 表示切替後に Highcharts などが寸法を取り直せるようにする
  window.dispatchEvent(new Event("resize"));
  browser.runtime.sendMessage({ type: "badge", mode }).catch(() => {});
}

// 複合チャートから body までの祖先に目印を付ける
function markChart() {
  const chart = document.querySelector(CHART_SELECTOR);
  if (!chart) return;
  chart.setAttribute("data-ni225-chart", "");
  for (let el = chart.parentElement; el && el !== root; el = el.parentElement) {
    el.setAttribute("data-ni225-path", "");
  }
}

let mode = loadMode();
applyMode(mode);

// ポップアップからの問い合わせと切り替え
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "set" && MODES.includes(msg.mode)) {
    mode = msg.mode;
    saveMode(mode);
    applyMode(mode);
  }
  return Promise.resolve(mode);
});

function onReady() {
  markChart();
  // 見つからなくても隠したままにはしない
  root.setAttribute("data-ni225-ready", "");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady, { once: true });
} else {
  onReady();
}
