import { useState, useEffect } from 'react'
import { ScreenCapture } from './components/ScreenCapture'
import { ResultPopup } from './components/ResultPopup'
import { Settings } from './components/Settings'
import { History } from './components/History'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'

type View = 'result' | 'capture' | 'settings' | 'history'

interface OcrResult {
  image: string
  text: string
  confidence?: number
}

function AppContent() {
  const { t } = useLanguage()
  const [view, setView] = useState<View>('result')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)

  // Load and apply theme on startup
  useEffect(() => {
    const loadTheme = async () => {
      const settings = await window.electronAPI.getSettings() as { theme?: string }
      applyTheme(settings.theme || 'dark')
    }
    loadTheme()
  }, [])

  // Apply theme to document
  const applyTheme = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme)
  }

  useEffect(() => {
    // Check URL hash for capture mode
    if (window.location.hash === '#/capture') {
      setView('capture')
    }

    // Listen for screenshot ready
    window.electronAPI.onScreenshotReady((screenshotData) => {
      setScreenshot(screenshotData)
    })

    // Listen for OCR start
    window.electronAPI.onOcrStart((imageData) => {
      setIsLoading(true)
      setError(null)
      setResult({ image: imageData, text: '' })
      setView('result')
    })

    // Listen for OCR result
    window.electronAPI.onOcrResult((ocrResult) => {
      setIsLoading(false)
      setResult(ocrResult)
    })

    // Listen for OCR error
    window.electronAPI.onOcrError((err) => {
      setIsLoading(false)
      setError(err.message)
    })

    // Listen for OCR cancelled
    window.electronAPI.onOcrCancelled(() => {
      setIsLoading(false)
      if (result) {
        setResult({ ...result, text: '' })
      }
    })

    // Listen for show result
    window.electronAPI.onShowResult((savedResult) => {
      setResult(savedResult)
      setView('result')
    })

    // Listen for show settings
    window.electronAPI.onShowSettings(() => {
      setView('settings')
    })

    return () => {
      window.electronAPI.removeAllListeners()
    }
  }, [])

  const handleCaptureComplete = (
    imageData: string,
    screenBounds: { x: number; y: number; width: number; height: number }
  ) => {
    window.electronAPI.captureComplete({ imageData, screenBounds })
    setScreenshot(null)
  }

  const handleCaptureCancel = () => {
    window.electronAPI.captureCancel()
    setScreenshot(null)
  }

  const handleCopy = (text: string) => {
    window.electronAPI.copyText(text)
  }

  const handleSearch = (text: string) => {
    window.electronAPI.googleSearch(text)
  }

  const handleInstagram = (text: string) => {
    window.electronAPI.instagramSearch(text)
  }

  const handleClose = () => {
    window.electronAPI.closeResult()
  }

  const handleTogglePin = () => {
    window.electronAPI.togglePin()
  }

  const handleCapture = () => {
    window.electronAPI.startCapture()
  }

  const handleCancelOcr = () => {
    window.electronAPI.cancelOcr()
  }

  const handleSettingsClose = () => {
    setView('result')
  }

  const handleRecrop = (croppedImage: string) => {
    setIsLoading(true)
    setError(null)
    setResult({ image: croppedImage, text: '' })
    window.electronAPI.captureComplete(croppedImage)
  }

  const handleTextEdit = (newText: string) => {
    if (result) {
      setResult({ ...result, text: newText })
    }
  }

  const handleGeminiOcr = async (imageData: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const geminiResult = await window.electronAPI.geminiOcr(imageData)
      if (geminiResult.text) {
        setResult({
          image: imageData,
          text: geminiResult.text,
          confidence: geminiResult.confidence
        })
      } else {
        setError(t('app.aiError'))
      }
    } catch {
      setError(t('app.aiErrorGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  // Render based on view
  if (view === 'capture' && screenshot) {
    return (
      <ScreenCapture
        screenshot={screenshot}
        onComplete={handleCaptureComplete}
        onCancel={handleCaptureCancel}
      />
    )
  }

  if (view === 'settings') {
    return <Settings onClose={handleSettingsClose} />
  }

  if (view === 'history') {
    return (
      <History
        onClose={() => setView('result')}
        onCopy={handleCopy}
        onSearch={handleSearch}
        onInstagram={handleInstagram}
        onSelectItem={(item) => {
          setResult({ image: item.image, text: item.text })
          setView('result')
        }}
      />
    )
  }

  return (
    <ResultPopup
      result={result}
      isLoading={isLoading}
      error={error}
      onCopy={handleCopy}
      onSearch={handleSearch}
      onInstagram={handleInstagram}
      onClose={handleClose}
      onTogglePin={handleTogglePin}
      onOpenSettings={() => setView('settings')}
      onOpenHistory={() => setView('history')}
      onCapture={handleCapture}
      onCancelOcr={handleCancelOcr}
      onRecrop={handleRecrop}
      onTextEdit={handleTextEdit}
      onGeminiOcr={handleGeminiOcr}
    />
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
