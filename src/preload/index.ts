import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Capture
  onScreenshotReady: (callback: (screenshot: string) => void) => {
    ipcRenderer.on('screenshot-ready', (_event, screenshot) => callback(screenshot))
  },
  captureComplete: (data: string | { imageData: string; screenBounds?: { x: number; y: number; width: number; height: number } }) => {
    ipcRenderer.send('capture-complete', data)
  },
  captureCancel: () => {
    ipcRenderer.send('capture-cancel')
  },

  // OCR Results
  onOcrStart: (callback: (imageData: string) => void) => {
    ipcRenderer.on('ocr-start', (_event, imageData) => callback(imageData))
  },
  onOcrResult: (callback: (result: { image: string; text: string; confidence: number; method?: string; methodDisplay?: string }) => void) => {
    ipcRenderer.on('ocr-result', (_event, result) => callback(result))
  },
  onOcrError: (callback: (error: { message: string }) => void) => {
    ipcRenderer.on('ocr-error', (_event, error) => callback(error))
  },
  onShowResult: (callback: (result: { image: string; text: string }) => void) => {
    ipcRenderer.on('show-result', (_event, result) => callback(result))
  },
  onShowSettings: (callback: () => void) => {
    ipcRenderer.on('show-settings', () => callback())
  },

  // Actions
  copyText: (text: string) => {
    ipcRenderer.send('copy-text', text)
  },
  googleSearch: (text: string) => {
    ipcRenderer.send('google-search', text)
  },
  instagramSearch: (text: string) => {
    ipcRenderer.send('instagram-search', text)
  },
  closeResult: () => {
    ipcRenderer.send('close-result')
  },
  togglePin: () => {
    ipcRenderer.send('toggle-pin')
  },

  // Settings
  getSettings: () => {
    return ipcRenderer.invoke('get-settings')
  },
  updateSettings: (settings: Record<string, unknown>) => {
    return ipcRenderer.invoke('update-settings', settings)
  },

  // History
  getHistory: () => {
    return ipcRenderer.invoke('get-history')
  },
  deleteHistoryItem: (id: string) => {
    return ipcRenderer.invoke('delete-history-item', id)
  },
  clearHistory: () => {
    return ipcRenderer.invoke('clear-history')
  },

  // Cleanup listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('screenshot-ready')
    ipcRenderer.removeAllListeners('ocr-start')
    ipcRenderer.removeAllListeners('ocr-result')
    ipcRenderer.removeAllListeners('ocr-error')
    ipcRenderer.removeAllListeners('show-result')
    ipcRenderer.removeAllListeners('show-settings')
  }
})

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      onScreenshotReady: (callback: (screenshot: string) => void) => void
      captureComplete: (data: string | { imageData: string; screenBounds?: { x: number; y: number; width: number; height: number } }) => void
      captureCancel: () => void
      onOcrStart: (callback: (imageData: string) => void) => void
      onOcrResult: (callback: (result: { image: string; text: string; confidence: number; method?: string; methodDisplay?: string }) => void) => void
      onOcrError: (callback: (error: { message: string }) => void) => void
      onShowResult: (callback: (result: { image: string; text: string }) => void) => void
      onShowSettings: (callback: () => void) => void
      copyText: (text: string) => void
      googleSearch: (text: string) => void
      instagramSearch: (text: string) => void
      closeResult: () => void
      togglePin: () => void
      getSettings: () => Promise<Record<string, unknown>>
      updateSettings: (settings: Record<string, unknown>) => Promise<Record<string, unknown>>
      getHistory: () => Promise<Array<{ id: string; image: string; text: string; timestamp: number }>>
      deleteHistoryItem: (id: string) => Promise<Array<{ id: string; image: string; text: string; timestamp: number }>>
      clearHistory: () => Promise<Array<never>>
      removeAllListeners: () => void
    }
  }
}
