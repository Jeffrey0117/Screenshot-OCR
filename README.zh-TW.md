<p align="center">
  <img src="assets/icon.png" alt="Screenshot OCR" width="128" />
</p>

<h1 align="center">Screenshot OCR</h1>

<p align="center">
  一鍵截圖，即時辨識文字，複製或搜尋。
</p>

<p align="center">
  <a href="https://jeffrey0117.github.io/Screenshot-OCR/">官方網站</a> &nbsp;|&nbsp;
  <a href="README.md">English</a>
</p>

## 功能

- **快捷截圖** - `Ctrl+Shift+S` 全域快捷鍵觸發截圖
- **即時辨識** - 選取區域後自動 OCR 辨識文字
- **多語言支援** - 繁體中文、簡體中文、英文、日文、韓文
- **離線運作** - 使用 Tesseract.js，無需網路連線
- **系統托盤** - 最小化常駐，隨時可用

## 安裝

```bash
# 安裝依賴
npm install

# 下載 OCR 語言檔 (首次執行)
npm run download-tessdata
```

## 開發

```bash
# 開發模式
npm run dev

# 打包
npm run electron:build
```

## 使用方式

1. 啟動應用程式
2. 按 `Ctrl+Shift+S` 開始截圖
3. 拖曳選取要辨識的區域
4. 辨識結果自動複製到剪貼簿
5. 可點擊「複製」或「Google 搜尋」

## 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+Shift+S` | 截圖辨識 |
| `Ctrl+C` | 複製文字 |
| `Ctrl+G` | Google 搜尋 |
| `Ctrl+P` | 釘選視窗 |
| `Esc` | 取消截圖/關閉視窗 |

## 技術棧

- Electron 28
- React 18
- Vite 5
- Tesseract.js 5
- TypeScript

## License

MIT
