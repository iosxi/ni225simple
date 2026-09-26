"use strict";

// タブごとの設定は sessions のタブ値として持つ。Firefox がタブを復元すると
// （再起動後も）値も一緒に戻る。ページの sessionStorage は Firefox 156 の既定
// （browser.sessionstore.collect_session_storage = false）では復元されないので使えない。
// MODES / TOGGLES / normalize は state.js にある。
const KEY = "state";
const BADGE = { all: "", chart: "図", other: "他" };

async function getState(tabId) {
  return normalize(await browser.sessions.getTabValue(tabId, KEY));
}

function showBadge(tabId, mode) {
  browser.browserAction.setBadgeText({ tabId, text: BADGE[mode] });
  browser.browserAction.setBadgeBackgroundColor({ tabId, color: "#1a5fb4" });
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === "hello" && sender.tab) {
    // content script から: 自分のタブの設定を問い合わせる。URL で設定を指定されて
    // 開いたとき（ブックマークなど）は、それをこのタブの設定として覚える
    let state;
    if (msg.state) {
      state = normalize(msg.state);
      await browser.sessions.setTabValue(sender.tab.id, KEY, state);
    } else {
      state = await getState(sender.tab.id);
    }
    showBadge(sender.tab.id, state.mode);
    return state;
  }
  if (msg.type === "get") {
    return getState(msg.tabId);
  }
  if (msg.type === "set") {
    // ポップアップから: そのタブの設定の一部を書き換える
    const state = await getState(msg.tabId);
    if (MODES.includes(msg.mode)) state.mode = msg.mode;
    if (TOGGLES.includes(msg.name)) state.toggles[msg.name] = Boolean(msg.on);
    await browser.sessions.setTabValue(msg.tabId, KEY, state);
    showBadge(msg.tabId, state.mode);
    await browser.tabs.sendMessage(msg.tabId, { type: "apply", state }).catch(() => {});
    return state;
  }
});
