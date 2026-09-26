# DEVELOPMENT

ni225simple の開発メモ。利用者向けの説明は [README.md](README.md)。

## バージョンとリリースの方針

**番号の付けかた: `manifest.json` の `N.0.0` ↔ git タグ `vN`。**

`src/` か `manifest.json` を変えたら番号を上げる。README や本書だけの変更では
上げない。AMO で署名した番号は**永久に消費される**ので、署名前に確定させる。

## 構成

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | MV2。`permissions` は `sessions` だけ。content script は `https://nikkei225jp.com/cme/*` のみ |
| `src/state.js` | 設定の形（`MODES` / `TOGGLES` / `normalize`）と URL パラメータとの変換。background と content script の両方で読む |
| `src/background.js` | タブごとの設定の正本（sessions のタブ値）とバッジ |
| `src/content.js` | 設定を `<html>` の属性に反映、複合チャートへの目印付け |
| `src/content.css` | 属性ごとの表示・非表示 |
| `src/popup.html` / `src/popup.js` | ツールバーの 3 択とチェックボックス |
| `tools/build-xpi.js` | 配布用 XPI の作成（再現可能ビルド） |
| `tools/sign.js` | AMO 署名（unlisted） |
| `tools/fetch-signed.js` | 署名済み XPI の取得のみやり直す |

### 表示の切り替えかた

複合チャートはページ内の `table#chartTBL`。`content.js` がこの表に
`data-ni225-chart`、そこから `body` までの祖先に `data-ni225-path` を付ける。

- 複合チャートのみ: `[data-ni225-path] > :not([data-ni225-path]):not([data-ni225-chart])`
  を隠す。祖先の兄弟をすべて隠すことになる。後から差し込まれる広告も同じ規則で
  隠れる。ページの「?」説明（`body` 直下の `.tooltip-content` / `.tooltip-overlay`）
  だけは開けるよう除外している。
- 複合チャート以外: `[data-ni225-chart]` だけを隠す。

モードは `<html data-ni225-mode>` に置く。「複合チャートのみ」では目印付けが
済むまで `body` を `visibility:hidden` にして、一瞬全体が見えるのを防ぐ。

### タブごとの記憶

設定 `{ mode, toggles: { nosidebar, noakawaku, notopmenu, nolinkmenu, noheader } }` を
`browser.sessions.setTabValue(tabId, "state", …)` でタブに結び付ける。
Firefox がタブを復元すると値も戻る。再起動でタブ ID が変わっても追従する
（ヘッドレス Firefox 156 で、同じプロファイルの終了→再起動を 1 タブ 3 回・
2 タブ 3 回試し、全回で戻った）。

**sessionStorage は使えない。** v1 はページの sessionStorage に置いていたが、
Firefox 156 の既定では `browser.sessionstore.collect_session_storage` が false で、
セッション復元に含まれない（実測）。v1 の再起動試験で戻ったのはたまたま。

content.js は同じタブの sessionStorage に**写し**を置き、読み込み直後はそれで
描いてから background に正本を問い合わせる。返事が来るまでと、複合チャートへの
目印付けが済むまでは `body` を `visibility:hidden` にして、元の表示が一瞬
見えるのを防ぐ。

### URL で指定された設定（ブックマーク用）

`?mode=chart&nosidebar=1` のように、`mode` かチェックボックス名のパラメータが
1 つでもあれば URL の指定を優先する（書いていない項目は既定値）。content.js は
それで即座に描き、`hello` に `state` として添えて送り、background がタブ値に保存する。
パラメータが 1 つもなければ従来どおりタブ値を使う。

設定が決まるたび（`hello` の返事、ポップアップからの `apply`）に、content.js が
`history.replaceState` で URL を今の設定に合わせる。既定値の項目は書かないので、
すべて既定値ならパラメータは消える。ページ自身のパラメータとハッシュは残す。
設定と URL が同じ意味なら書き換えない（`?mode=xyz&noakawaku` のような表記も残る）。

同じタイミングで `document.title` の末尾に設定（`stateLabel`: `mode=<mode>` と ON の
チェックボックス名を空白区切り、既定値は書かない）を付ける。元の title は
DOMContentLoaded で控え、それより前に設定が決まったら控えた後に書く。
サイトは title を書き換えない（20 秒観測して不変、2026-09-26 実測）ので、
控えた値を使い続けてよい。

ヘッドレス Firefox 156 で確かめたこと: URL 指定で開くと表示・ポップアップ・タブ値が
その設定になる / ポップアップで変えると URL が追従し `history.length` は増えない /
再読込で保たれる / 既定値に戻すとパラメータが消える / `?p=1…#chartTBL` の
`p` とハッシュが残る / 別タブの URL 指定は他のタブに影響しない。

### チェックボックスを足すとき

1. `src/popup.html` に `<input type="checkbox" name="<name>">` を足す
2. `src/state.js` の `TOGGLES` に `<name>` を足す（URL パラメータ名にもなる）
3. `src/content.css` に `html[data-ni225-<name>] <セレクタ> { … }` を足す

### 権限

`permissions` は `sessions` だけ。インストール時の確認に出るのは次の 2 行
（Firefox 156 の `ExtensionData.formatPermissionStrings` で実測）。

- 「nikkei225jp.com ドメイン下のサイトデータへのアクセス」— content script の対象から
- 「最近閉じたタブへのアクセス」— `sessions` から

権限なしでタブを再起動越しに見分ける手段が無いため、`sessions` は外せない。
ポップアップは `tabs.query({active})` でタブ ID を取り、`tabs.sendMessage` の
返事の有無で対象ページかを判断する。どちらも `tabs` 権限なしで使える範囲
（URL やタイトルは読まない）。

権限を足すときは、この確認文がどう変わるかを実測してから決めること。

## 作業手順

### 開発時の読み込み

```sh
npx web-ext run --source-dir . --ignore-files "tools/**" "dist/**"
npx web-ext lint --source-dir . --ignore-files "tools/**" "dist/**"
```

または `about:debugging#/runtime/this-firefox` から `manifest.json` を選ぶ。

### XPI の作成

```sh
node tools/build-xpi.js     # -> dist/ni225simple-<version>.xpi
```

### 署名

```powershell
. C:\projects\.keys\follient\apikey.ps1   # AMO_JWT_ISSUER / AMO_JWT_SECRET
node tools/sign.js
```

資格情報は環境変数からのみ読む。AMO の API キーはアカウント単位なので
follient と共用している。`--channel unlisted` 固定で、署名済み XPI が `dist/` に出る。
`browser_specific_settings.gecko.id` は AMO 上でアカウントに紐づくので変更しないこと。

アップロード後にダウンロードだけ失敗したときは、番号を上げずに
`node tools/fetch-signed.js` で取得だけやり直す。
