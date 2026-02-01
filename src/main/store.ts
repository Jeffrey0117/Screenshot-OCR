import Store from 'electron-store'
import type { Language } from '../shared/i18n'

export interface HistoryItem {
  id: string
  image: string
  text: string
  timestamp: number
}

export interface AppSettings {
  // General
  autoStart: boolean
  minimizeToTray: boolean
  autoCopy: boolean
  autoCloseDelay: number
  pinned: boolean

  // Shortcuts
  shortcuts: {
    capture: string
    copy: string
    search: string
  }

  // OCR
  ocrLanguages: string[]
  ocrAccuracy: 'fast' | 'balanced' | 'accurate'
  preprocessEnabled: boolean
  preprocessAutoInvert: boolean

  // AI Vision
  geminiApiKey: string

  // Appearance
  theme: 'light' | 'dark' | 'system'
  resultPosition: 'mouse' | 'center' | 'remember'
  lastResultPosition?: { x: number; y: number }

  // Language
  language: Language
}

const defaults: AppSettings = {
  autoStart: false,
  minimizeToTray: true,
  autoCopy: true,
  autoCloseDelay: 5,
  pinned: false,

  shortcuts: {
    capture: 'CommandOrControl+Shift+S',
    copy: 'CommandOrControl+C',
    search: 'CommandOrControl+G'
  },

  ocrLanguages: ['eng', 'chi_tra'],
  ocrAccuracy: 'balanced',
  preprocessEnabled: true,
  preprocessAutoInvert: true,

  geminiApiKey: '',

  theme: 'dark',
  resultPosition: 'center',

  language: 'zh-TW'
}

let store: Store<AppSettings> | null = null

export function createStore() {
  store = new Store<AppSettings>({ defaults })
  return store
}

export function getSettings(): AppSettings {
  if (!store) {
    store = new Store<AppSettings>({ defaults })
  }
  return store.store
}

export function updateSettings(updates: Partial<AppSettings>) {
  if (!store) {
    store = new Store<AppSettings>({ defaults })
  }

  Object.entries(updates).forEach(([key, value]) => {
    store!.set(key as keyof AppSettings, value)
  })
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  if (!store) {
    store = new Store<AppSettings>({ defaults })
  }
  return store.get(key)
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  if (!store) {
    store = new Store<AppSettings>({ defaults })
  }
  store.set(key, value)
}

// History management
const MAX_HISTORY_ITEMS = 50

let historyStore: Store<{ history: HistoryItem[] }> | null = null

function getHistoryStore() {
  if (!historyStore) {
    historyStore = new Store<{ history: HistoryItem[] }>({
      name: 'history',
      defaults: { history: [] }
    })
  }
  return historyStore
}

export function getHistory(): HistoryItem[] {
  return getHistoryStore().get('history', [])
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  const store = getHistoryStore()
  const history = store.get('history', [])

  const newItem: HistoryItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    timestamp: Date.now(),
    ...item
  }

  // Add to beginning, limit to MAX_HISTORY_ITEMS
  const updatedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
  store.set('history', updatedHistory)

  return newItem
}

export function deleteHistoryItem(id: string): void {
  const store = getHistoryStore()
  const history = store.get('history', [])
  store.set('history', history.filter(item => item.id !== id))
}

export function clearHistory(): void {
  getHistoryStore().set('history', [])
}
