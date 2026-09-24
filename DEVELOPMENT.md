# DEVELOPMENT

ni225simple の開発メモ。利用者向けの説明は [README.md](README.md)。

## バージョンとリリースの方針

**番号の付けかた: `manifest.json` の `N.0.0` ↔ git タグ `vN`。**

`src/` か `manifest.json` を変えたら番号を上げる。README や本書だけの変更では
上げない。AMO で署名した番号は**永久に消費される**ので、署名前に確定させる。

## 構成

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | MV2。`permissions` は空。content script は `https://nikkei225jp.com/cme/*` のみ |
| `src/content.js` | モードの保持（sessionStorage）と、複合チャートへの目印付け |
| `src/content.css` | モードごとの表示・非表示 |
| `src/popup.html` / `src/popup.js` | ツールバーの 3 択 |
| `src/background.js` | タブごとのバッジ表示だけ |
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

### タブごとの記憶を sessionStorage にしている理由

`sessionStorage` はタブごとに独立していて、Firefox のセッション復元で一緒に
戻る。`browser.sessions.setTabValue` でも同じことができるが、`sessions` 権限が
要り、インストール時の確認に「最近閉じたタブへのアクセス」が増える（実測）。
権限を増やさないためにこちらを選んだ。

`content_scripts` は `document_start` で動き、`sessionStorage` は同期で読めるので、
ページの描画前にモードが決まる。

### 権限

`permissions` は空。インストール時の確認に出るのは、content script の対象から
来る「nikkei225jp.com ドメイン下のサイトデータへのアクセス」の 1 行だけ
（Firefox 156 の `ExtensionData.formatPermissionStrings` で実測）。
ポップアップは `tabs.query({active})` でタブ ID を取り、`tabs.sendMessage` で
content script と話す。どちらも `tabs` 権限なしで使える範囲に収めている
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
