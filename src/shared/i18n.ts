export type Language = 'en' | 'zh-TW'

export type TranslationKey = keyof typeof translations.en

const translations = {
  en: {
    // Tray Menu
    'tray.capture': 'Screenshot OCR',
    'tray.showPanel': 'Open Panel',
    'tray.showLast': 'Show Last Result',
    'tray.settings': 'Settings',
    'tray.quit': 'Quit',

    // Settings
    'settings.loading': 'Loading...',
    'settings.title': 'Settings',
    'settings.shortcutLabel': 'Capture Shortcut',
    'settings.apiKey': 'Gemini API Key',
    'settings.getKey': 'Get Key',
    'settings.apiPlaceholder': 'Paste API Key (optional)',
    'settings.show': 'Show',
    'settings.hide': 'Hide',
    'settings.general': 'General',
    'settings.autoStart': 'Auto Start on Boot',
    'settings.minimizeToTray': 'Minimize to Tray',
    'settings.autoCopy': 'Auto Copy After Recognition',
    'settings.autoClose': 'Auto Close (sec)',
    'settings.ocr': 'OCR',
    'settings.accuracy': 'Accuracy',
    'settings.fast': 'Fast',
    'settings.balanced': 'Balanced',
    'settings.accurate': 'Accurate',
    'settings.preprocess': 'Image Preprocessing',
    'settings.autoInvert': 'Auto Invert Dark Background',
    'settings.cancel': 'Cancel',
    'settings.saving': 'Saving...',
    'settings.save': 'Save',
    'settings.language': 'Language',

    // ResultPopup
    'result.capture': 'Capture',
    'result.pin': 'Pin',
    'result.pinTooltip': 'Pin Window',
    'result.history': 'History',
    'result.historyTooltip': 'History',
    'result.settings': 'Settings',
    'result.settingsTooltip': 'Settings',
    'result.close': 'Close',
    'result.emptyHint': 'Press Ctrl+Shift+S to capture',
    'result.recognizing': 'Recognizing...',
    'result.cancel': 'Cancel',
    'result.placeholder': 'Click here to type or edit text...',
    'result.collapse': 'Collapse',
    'result.expand': 'Show More',
    'result.confidence': 'Confidence',
    'result.confirmCrop': 'Confirm Crop',
    'result.cancelCrop': 'Cancel',
    'result.copied': 'Copied',
    'result.copy': 'Copy',
    'result.cropTooltip': 'Reselect Area',
    'result.crop': 'Crop',
    'result.aiTooltip': 'Use AI to Re-recognize',
    'result.search': 'Search',
    'result.editHint': 'Drag to select area to recognize',
    'result.selectedHint': 'Selected {count} chars',

    // History
    'history.confirmClear': 'Clear all history?',
    'history.title': 'History',
    'history.clearAll': 'Clear All',
    'history.loading': 'Loading...',
    'history.empty': 'No history yet',
    'history.noText': '(No text)',
    'history.copy': 'Copy',
    'history.delete': 'Delete',

    // ScreenCapture
    'capture.dragHint': 'Drag to select area',
    'capture.cancelHint': 'Right-click / ESC to cancel',

    // App
    'app.aiError': 'AI recognition failed. Please check your API Key.',
    'app.aiErrorGeneric': 'AI recognition error',

    // TextExtractor
    'method.uiAutomation': 'Direct Read',
    'method.gemini': 'Gemini AI',
    'method.paddle': 'PaddleOCR',
    'method.tesseract': 'Tesseract OCR',
    'method.unknown': 'Unknown',
  },

  'zh-TW': {
    // Tray Menu
    'tray.capture': 'Screenshot OCR',
    'tray.showPanel': '開啟面板',
    'tray.showLast': '顯示上次結果',
    'tray.settings': '設定',
    'tray.quit': '退出',

    // Settings
    'settings.loading': '載入中...',
    'settings.title': '設定',
    'settings.shortcutLabel': '截圖辨識',
    'settings.apiKey': 'Gemini API Key',
    'settings.getKey': '取得金鑰',
    'settings.apiPlaceholder': '貼上 API Key（選填）',
    'settings.show': '顯示',
    'settings.hide': '隱藏',
    'settings.general': '一般',
    'settings.autoStart': '開機自動啟動',
    'settings.minimizeToTray': '最小化到托盤',
    'settings.autoCopy': '辨識後自動複製',
    'settings.autoClose': '自動關閉 (秒)',
    'settings.ocr': 'OCR',
    'settings.accuracy': '辨識精度',
    'settings.fast': '快速',
    'settings.balanced': '平衡',
    'settings.accurate': '精確',
    'settings.preprocess': '圖片預處理',
    'settings.autoInvert': '自動反轉深色背景',
    'settings.cancel': '取消',
    'settings.saving': '儲存中...',
    'settings.save': '儲存',
    'settings.language': '語言',

    // ResultPopup
    'result.capture': '截圖',
    'result.pin': '置頂',
    'result.pinTooltip': '釘選視窗',
    'result.history': '歷史',
    'result.historyTooltip': '歷史紀錄',
    'result.settings': '設定',
    'result.settingsTooltip': '設定',
    'result.close': '關閉',
    'result.emptyHint': '按 Ctrl+Shift+S 截圖辨識',
    'result.recognizing': '辨識中...',
    'result.cancel': '取消',
    'result.placeholder': '點擊此處輸入或修正文字...',
    'result.collapse': '收合',
    'result.expand': '展開更多',
    'result.confidence': '信心度',
    'result.confirmCrop': '確認裁切',
    'result.cancelCrop': '取消',
    'result.copied': '已複製',
    'result.copy': '複製',
    'result.cropTooltip': '重新框選區域',
    'result.crop': '裁切',
    'result.aiTooltip': '使用 AI 重新辨識',
    'result.search': '搜尋',
    'result.editHint': '拖曳選取要辨識的區域',
    'result.selectedHint': '已選取 {count} 字',

    // History
    'history.confirmClear': '確定要清除所有歷史紀錄？',
    'history.title': '歷史紀錄',
    'history.clearAll': '清除全部',
    'history.loading': '載入中...',
    'history.empty': '還沒有歷史紀錄',
    'history.noText': '(無文字)',
    'history.copy': '複製',
    'history.delete': '刪除',

    // ScreenCapture
    'capture.dragHint': '拖曳選取區域',
    'capture.cancelHint': '右鍵 / ESC 取消',

    // App
    'app.aiError': 'AI 辨識失敗，請確認已設定 API Key',
    'app.aiErrorGeneric': 'AI 辨識發生錯誤',

    // TextExtractor
    'method.uiAutomation': '直接讀取',
    'method.gemini': 'Gemini AI',
    'method.paddle': 'PaddleOCR',
    'method.tesseract': 'Tesseract OCR',
    'method.unknown': '未知',
  },
} as const

export function t(key: TranslationKey, lang: Language = 'zh-TW'): string {
  return translations[lang][key] ?? key
}

export { translations }
