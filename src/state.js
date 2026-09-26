"use strict";

// 設定の形と、URL のパラメータとの読み書き。background と content script の両方で読み込む。
// 設定は { mode, toggles: { <name>: true/false } }。
// URL では ?mode=chart&nosidebar=1 のように書く（mode は chart / other / all、
// チェックボックスは 1 で ON、0 で OFF。書いていないものは既定値 = all / OFF）。
const MODES = ["all", "chart", "other"];
const TOGGLES = ["nosidebar", "noakawaku", "notopmenu", "nolinkmenu", "noheader"];
const PARAMS = ["mode", ...TOGGLES];

function normalize(raw) {
  const state = { mode: "all", toggles: {} };
  if (raw && MODES.includes(raw.mode)) state.mode = raw.mode;
  for (const name of TOGGLES) state.toggles[name] = Boolean(raw && raw.toggles && raw.toggles[name]);
  return state;
}

function sameState(a, b) {
  return a.mode === b.mode && TOGGLES.every((name) => a.toggles[name] === b.toggles[name]);
}

// URL に設定のパラメータが 1 つもなければ null
function stateFromURL(href) {
  const params = new URL(href).searchParams;
  if (!PARAMS.some((name) => params.has(name))) return null;
  const raw = { mode: params.get("mode"), toggles: {} };
  for (const name of TOGGLES) {
    raw.toggles[name] = params.has(name) && !["0", "false", "off"].includes(params.get(name));
  }
  return normalize(raw);
}

// 設定を表す URL。ページ自身のパラメータとハッシュは残し、既定値のものは書かない
function urlWithState(href, state) {
  const url = new URL(href);
  for (const name of PARAMS) url.searchParams.delete(name);
  if (state.mode !== "all") url.searchParams.append("mode", state.mode);
  for (const name of TOGGLES) {
    if (state.toggles[name]) url.searchParams.append(name, "1");
  }
  return url.href;
}
