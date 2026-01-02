import { useState, useEffect } from 'react'
import { ScreenCapture } from './components/ScreenCapture'
import { ResultPopup } from './components/ResultPopup'
import { Settings } from './components/Settings'

type View = 'result' | 'capture' | 'settings'

interface OcrResult {
  image: string
  text: string
  confidence?: number
}

function App() {
  const [view, setView] = useState<View>('result')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null)

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

  const handleCaptureComplete = (imageData: string) => {
    window.electronAPI.captureComplete(imageData)
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

  const handleClose = () => {
    window.electronAPI.closeResult()
  }

  const handleTogglePin = () => {
    window.electronAPI.togglePin()
  }

  const handleSettingsClose = () => {
    setView('result')
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

  return (
    <ResultPopup
      result={result}
      isLoading={isLoading}
      error={error}
      onCopy={handleCopy}
      onSearch={handleSearch}
      onClose={handleClose}
      onTogglePin={handleTogglePin}
      onOpenSettings={() => setView('settings')}
    />
  )
}

export default App
