"use strict";

const radios = document.querySelectorAll('input[name="mode"]');
const note = document.querySelector(".note");

(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let current;
  try {
    // 対象ページなら content.js が今のモードを返す
    current = await browser.tabs.sendMessage(tab.id, { type: "get" });
  } catch {
    note.textContent = "このページでは使えません（nikkei225jp.com/cme/ で使います）";
    for (const r of radios) r.disabled = true;
    return;
  }
  for (const r of radios) {
    r.checked = r.value === current;
    r.addEventListener("change", () => {
      if (r.checked) browser.tabs.sendMessage(tab.id, { type: "set", mode: r.value });
    });
  }
})();
