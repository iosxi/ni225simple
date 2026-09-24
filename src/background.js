"use strict";

// ツールバーのバッジに、そのタブのモードを出すだけ。
// モードそのものは各タブのページ側（content.js）が持っている。
const BADGE = { all: "", chart: "図", other: "他" };

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "badge" || !sender.tab) return;
  const tabId = sender.tab.id;
  browser.browserAction.setBadgeText({ tabId, text: BADGE[msg.mode] ?? "" });
  browser.browserAction.setBadgeBackgroundColor({ tabId, color: "#1a5fb4" });
});
