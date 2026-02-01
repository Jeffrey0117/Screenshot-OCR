<p align="center">
  <img src="assets/icon.png" alt="Screenshot OCR" width="128" />
</p>

<h1 align="center">Screenshot OCR</h1>

<p align="center">
  Capture your screen, instantly recognize text, copy or search.
</p>

<p align="center">
  <a href="https://jeffrey0117.github.io/Screenshot-OCR/">Homepage</a> &nbsp;|&nbsp;
  <a href="README.zh-TW.md">繁體中文</a>
</p>

## Screenshot

<p align="center">
  <img src="mainpic.png" alt="Screenshot OCR - Main Interface" width="400" />
</p>

## Features

- **Quick Capture** - Global hotkey `Ctrl+Shift+S` to trigger screenshot
- **Instant Recognition** - Automatic OCR after selecting a region
- **Multi-language** - Traditional Chinese, Simplified Chinese, English, Japanese, Korean
- **Offline** - Powered by Tesseract.js, no internet required
- **System Tray** - Runs minimized in the background, always ready

## Install

```bash
# Install dependencies
npm install

# Download OCR language data (first run)
npm run download-tessdata
```

## Development

```bash
# Dev mode
npm run dev

# Build
npm run electron:build
```

## Usage

1. Launch the app
2. Press `Ctrl+Shift+S` to start capturing
3. Drag to select the region to recognize
4. Recognized text is automatically copied to clipboard
5. Click "Copy" or "Google Search" for further actions

<p align="center">
  <img src="use.png" alt="Screenshot OCR - Usage Example" width="400" />
</p>

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Capture & recognize |
| `Ctrl+C` | Copy text |
| `Ctrl+G` | Google search |
| `Ctrl+P` | Pin window |
| `Esc` | Cancel capture / close window |

## Tech Stack

- Electron 28
- React 18
- Vite 5
- Tesseract.js 5
- TypeScript

## License

MIT
