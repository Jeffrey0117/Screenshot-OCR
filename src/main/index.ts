import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  clipboard,
  shell,
  screen,
  desktopCapturer
} from 'electron'
import path from 'path'
import { createStore, getSettings, updateSettings, addToHistory, getHistory, deleteHistoryItem, clearHistory } from './store'
import { initOcr, recognizeImage, terminateOcr } from './ocr'


let mainWindow: BrowserWindow | null = null
let captureWindow: BrowserWindow | null = null
let tray: Tray | null = null
let lastResult: { image: string; text: string } | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Renderer URL - electron-vite uses 5173 by default, falls back to other ports if busy
const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT || '5173'
const RENDERER_URL = isDev
  ? `http://localhost:${DEV_SERVER_PORT}`
  : `file://${path.join(__dirname, '../dist/index.html')}`

/**
 * Create the main result window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 400,
    show: false,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadURL(RENDERER_URL)

  mainWindow.on('blur', () => {
    const settings = getSettings()
    if (!settings.pinned && mainWindow?.isVisible()) {
      // Auto-close after delay if not pinned
      if (settings.autoCloseDelay > 0) {
        setTimeout(() => {
          if (mainWindow?.isVisible() && !getSettings().pinned) {
            mainWindow.hide()
          }
        }, settings.autoCloseDelay * 1000)
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Create fullscreen capture overlay window
 */
function createCaptureWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  captureWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  captureWindow.loadURL(`${RENDERER_URL}#/capture`)

  captureWindow.on('closed', () => {
    captureWindow = null
  })
}

/**
 * Create system tray
 */
function createTray() {
  // Get the correct assets path
  // In dev: app.getAppPath() returns the project root
  // In prod: use process.resourcesPath
  const iconPath = isDev
    ? path.join(app.getAppPath(), 'assets/tray-icon.png')
    : path.join(process.resourcesPath, 'assets/tray-icon.png')

  console.log('Tray icon path:', iconPath)
  console.log('App path:', app.getAppPath())

  // Create tray icon
  let trayIcon: Electron.NativeImage
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    // Resize for tray (16x16 or 32x32 for HiDPI)
    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
    console.log('Tray icon loaded, isEmpty:', trayIcon.isEmpty())
  } catch (err) {
    console.error('Failed to load tray icon:', err)
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADPSURBVDiNpZMxDoJAEEXfLhQkFhYewMLKzkIPYOMRbDyCN/AoXMHKK9hYWHgAC0oSEgsLNhZ7CYLIEvyT6c7M/jczO7sW/yTbJDYJfALvJSM+cIhzXOBqIgYgVdVMVXML4BK4VtVMAFT1QlVz4LGpYCIGPqraJXbxGLgHHqrKBJ7xPzOmqr5/swNyGvtbVfNGh5kFbAIW0PP/nWr0Bri1fwGwBvTDR2sB24CIiBX42uS2iNgGtkVEroj4Mf3WJt+1+6+2DbBnF9gB9gA7dW36BXjFXz4/mVL3AAAAAElFTkSuQmCC'
  ) : trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Screenshot OCR',
      click: () => startCapture()
    },
    {
      label: 'Show Last Result',
      click: () => showLastResult(),
      enabled: lastResult !== null
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => showSettings()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Screenshot OCR')
  tray.setContextMenu(contextMenu)

  // Left click to start capture
  tray.on('click', () => startCapture())
}

/**
 * Register global shortcuts
 */
function registerShortcuts() {
  const settings = getSettings()

  // Unregister all first
  globalShortcut.unregisterAll()

  // Register capture shortcut
  console.log('Registering shortcut:', settings.shortcuts.capture)
  const registered = globalShortcut.register(settings.shortcuts.capture, () => {
    console.log('Capture shortcut triggered!')
    startCapture()
  })

  if (!registered) {
    console.error('Failed to register capture shortcut:', settings.shortcuts.capture)
  } else {
    console.log('Shortcut registered successfully!')
  }
}

/**
 * Hide/show system cursor using Windows API
 */
function setCursorVisibility(visible: boolean): void {
  if (process.platform !== 'win32') return

  try {
    // Use PowerShell to hide/show cursor via Windows API
    const { execSync } = require('child_process')
    const script = visible
      ? `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern int ShowCursor(bool bShow);' -Name Win32 -Namespace System; while([System.Win32]::ShowCursor($true) -lt 0){}`
      : `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern int ShowCursor(bool bShow);' -Name Win32 -Namespace System; while([System.Win32]::ShowCursor($false) -ge 0){}`

    execSync(`powershell -Command "${script}"`, { windowsHide: true })
    console.log(`Cursor ${visible ? 'shown' : 'hidden'}`)
  } catch (e) {
    console.log('Failed to toggle cursor visibility:', e)
  }
}

/**
 * Start screen capture
 */
async function startCapture() {
  console.log('Starting capture...')

  // Hide main window before capturing to avoid capturing our own UI
  const wasMainWindowVisible = mainWindow?.isVisible() ?? false
  if (wasMainWindowVisible) {
    mainWindow?.hide()
    console.log('Main window hidden before capture')
  }

  // Hide cursor before screenshot
  setCursorVisibility(false)

  // Wait a bit for the window and cursor to fully hide
  await new Promise(resolve => setTimeout(resolve, 150))

  if (!captureWindow) {
    console.log('Creating capture window...')
    createCaptureWindow()
  }

  // Get screen screenshot first
  console.log('Getting desktop sources...')
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: screen.getPrimaryDisplay().size
  })

  // Restore cursor immediately after screenshot
  setCursorVisibility(true)

  console.log('Found sources:', sources.length)

  if (sources.length > 0) {
    const screenshot = sources[0].thumbnail.toDataURL()
    console.log('Screenshot captured, sending to renderer...')
    captureWindow?.webContents.send('screenshot-ready', screenshot)
  }

  captureWindow?.show()
  captureWindow?.focus()
  console.log('Capture window shown')
}

/**
 * Show last OCR result
 */
function showLastResult() {
  if (!mainWindow) {
    createMainWindow()
  }

  if (lastResult) {
    mainWindow?.webContents.send('show-result', lastResult)
    mainWindow?.show()
    mainWindow?.focus()
  }
}

/**
 * Show settings
 */
function showSettings() {
  if (!mainWindow) {
    createMainWindow()
  }

  mainWindow?.webContents.send('show-settings')
  mainWindow?.show()
  mainWindow?.focus()
}

/**
 * Process captured region
 */
async function processCapturedRegion(imageData: string) {
  if (!mainWindow) {
    createMainWindow()
  }

  // Show loading state
  mainWindow?.webContents.send('ocr-start', imageData)
  mainWindow?.show()
  mainWindow?.focus()

  try {
    // Perform OCR
    const result = await recognizeImage(imageData)

    lastResult = {
      image: imageData,
      text: result.text
    }

    // Add to history
    addToHistory({
      image: imageData,
      text: result.text
    })

    // Send result to renderer
    mainWindow?.webContents.send('ocr-result', {
      image: imageData,
      text: result.text,
      confidence: result.confidence
    })

    // Auto copy if enabled
    const settings = getSettings()
    if (settings.autoCopy) {
      clipboard.writeText(result.text)
    }

    // Update tray menu
    if (tray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Screenshot OCR',
          click: () => startCapture()
        },
        {
          label: 'Show Last Result',
          click: () => showLastResult(),
          enabled: true
        },
        { type: 'separator' },
        {
          label: 'Settings',
          click: () => showSettings()
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => app.quit()
        }
      ])
      tray.setContextMenu(contextMenu)
    }
  } catch (error) {
    console.error('OCR error:', error)
    mainWindow?.webContents.send('ocr-error', {
      message: error instanceof Error ? error.message : 'OCR failed'
    })
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Capture completed
  ipcMain.on('capture-complete', (_event, imageData: string) => {
    captureWindow?.hide()
    processCapturedRegion(imageData)
  })

  // Capture cancelled
  ipcMain.on('capture-cancel', () => {
    captureWindow?.hide()
  })

  // Copy text
  ipcMain.on('copy-text', (_event, text: string) => {
    clipboard.writeText(text)
  })

  // Google search
  ipcMain.on('google-search', (_event, text: string) => {
    const query = encodeURIComponent(text)
    shell.openExternal(`https://www.google.com/search?q=${query}`)
  })

  // Instagram search - directly go to profile
  ipcMain.on('instagram-search', (_event, text: string) => {
    // Remove @ if present and trim whitespace
    const username = text.replace('@', '').trim()
    shell.openExternal(`https://www.instagram.com/${username}`)
  })

  // Close result window
  ipcMain.on('close-result', () => {
    mainWindow?.hide()
  })

  // Toggle pin
  ipcMain.on('toggle-pin', () => {
    const settings = getSettings()
    updateSettings({ pinned: !settings.pinned })
  })

  // Get settings
  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  // Update settings
  ipcMain.handle('update-settings', (_event, newSettings) => {
    updateSettings(newSettings)
    registerShortcuts() // Re-register shortcuts if changed
    return getSettings()
  })

  // History handlers
  ipcMain.handle('get-history', () => {
    return getHistory()
  })

  ipcMain.handle('delete-history-item', (_event, id: string) => {
    deleteHistoryItem(id)
    return getHistory()
  })

  ipcMain.handle('clear-history', () => {
    clearHistory()
    return []
  })
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize store
  createStore()

  // Initialize OCR
  const settings = getSettings()
  await initOcr(settings.ocrLanguages)

  // Create windows
  createMainWindow()
  createTray()

  // Register shortcuts
  registerShortcuts()

  // Setup IPC
  setupIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit on window close, keep tray running
})

app.on('before-quit', async () => {
  globalShortcut.unregisterAll()
  await terminateOcr()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
