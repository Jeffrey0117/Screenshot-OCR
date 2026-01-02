import Store from 'electron-store'

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

  // Appearance
  theme: 'light' | 'dark' | 'system'
  resultPosition: 'mouse' | 'center' | 'remember'
  lastResultPosition?: { x: number; y: number }
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

  theme: 'dark',
  resultPosition: 'center'
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
