"use strict";

// 設定の正本は background（sessions のタブ値）にある。問い合わせの返事を待つ間に
// 一瞬元の表示が見えないよう、同じタブの sessionStorage にも写しを置き、読み込み
// 直後はそれで描く。写しは同じセッション中の再読込で効き、再起動後は正本で上書きする。
const CACHE_KEY = "ni225simple-state";
const root = document.documentElement;
const CHART_SELECTOR = "#chartTBL";

function loadCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function saveCache(state) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // 写しが置けなくても、正本があるので困らない
  }
}

// mode は <html data-ni225-mode>、チェックボックスは <html data-ni225-<name>> になる。
// 効果は content.css に書く
function apply(state) {
  if (!state) return;
  if (state.mode === "chart" || state.mode === "other") {
    root.setAttribute("data-ni225-mode", state.mode);
  } else {
    root.removeAttribute("data-ni225-mode");
  }
  for (const [name, on] of Object.entries(state.toggles || {})) {
    root.toggleAttribute("data-ni225-" + name, Boolean(on));
  }
  // 表示切替後に Highcharts などが寸法を取り直せるようにする
  window.dispatchEvent(new Event("resize"));
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

let ready = false;
let answered = false;

// 「チャートのみ」の目印付けと正本の返事、両方がそろうまで body を隠しておく
function reveal() {
  if (ready && answered) root.setAttribute("data-ni225-ready", "");
}

// 今の設定をアドレスバーの URL にも書く。そのままブックマークすれば、同じ設定で開ける。
// 履歴は増やさない（replaceState）
function showInURL(state) {
  const current = stateFromURL(location.href) || normalize(null);
  if (sameState(current, normalize(state))) return;
  history.replaceState(history.state, "", urlWithState(location.href, normalize(state)));
}

// URL で設定を指定されて開いたとき（ブックマークなど）は、それをこのタブの設定にする。
// 指定がなければ、このタブで覚えている設定を使う
const fromURL = stateFromURL(location.href);
apply(fromURL || loadCache());

browser.runtime
  .sendMessage({ type: "hello", state: fromURL })
  .then((state) => {
    saveCache(state);
    apply(state);
    showInURL(state);
  })
  .catch(() => {})
  .finally(() => {
    answered = true;
    reveal();
  });

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "apply") {
    saveCache(msg.state);
    apply(msg.state);
    showInURL(msg.state);
  }
  // ポップアップが「このタブで使えるか」を確かめるための返事
  if (msg.type === "ping") return Promise.resolve(true);
});

function onReady() {
  markChart();
  ready = true;
  reveal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady, { once: true });
} else {
  onReady();
}
