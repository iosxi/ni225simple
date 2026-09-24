"use strict";

const radios = document.querySelectorAll('input[name="mode"]');
const checks = document.querySelectorAll('input[type="checkbox"]');
const note = document.querySelector(".note");

(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  try {
    // 対象ページには content.js がいて返事をする。URL を読む権限は使わない
    await browser.tabs.sendMessage(tab.id, { type: "ping" });
  } catch {
    note.textContent = "このページでは使えません（nikkei225jp.com/cme/ で使います）";
    for (const input of [...radios, ...checks]) input.disabled = true;
    return;
  }
  const state = await browser.runtime.sendMessage({ type: "get", tabId: tab.id });
  for (const r of radios) {
    r.checked = r.value === state.mode;
    r.addEventListener("change", () => {
      if (r.checked) browser.runtime.sendMessage({ type: "set", tabId: tab.id, mode: r.value });
    });
  }
  for (const c of checks) {
    c.checked = Boolean(state.toggles[c.name]);
    c.addEventListener("change", () => {
      browser.runtime.sendMessage({ type: "set", tabId: tab.id, name: c.name, on: c.checked });
    });
  }
})();
