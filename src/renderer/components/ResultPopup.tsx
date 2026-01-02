import { useState, useEffect, useRef } from 'react'
import '../styles/ResultPopup.css'

interface OcrResult {
  image: string
  text: string
  confidence?: number
}

interface ResultPopupProps {
  result: OcrResult | null
  isLoading: boolean
  error: string | null
  onCopy: (text: string) => void
  onSearch: (text: string) => void
  onClose: () => void
  onTogglePin: () => void
  onOpenSettings: () => void
}

export function ResultPopup({
  result,
  isLoading,
  error,
  onCopy,
  onSearch,
  onClose,
  onTogglePin,
  onOpenSettings
}: ResultPopupProps) {
  const [isPinned, setIsPinned] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString())
      } else {
        setSelectedText(null)
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && !selectedText) {
          e.preventDefault()
          handleCopy()
        } else if (e.key === 'g') {
          e.preventDefault()
          handleSearch()
        } else if (e.key === 'p') {
          e.preventDefault()
          handleTogglePin()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [result, selectedText])

  const handleCopy = () => {
    const textToCopy = selectedText || result?.text
    if (textToCopy) {
      onCopy(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSearch = () => {
    const textToSearch = selectedText || result?.text
    if (textToSearch) {
      onSearch(textToSearch)
    }
  }

  const handleTogglePin = () => {
    setIsPinned(!isPinned)
    onTogglePin()
  }

  // No result yet
  if (!result && !isLoading && !error) {
    return (
      <div className="result-popup empty">
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <p>按 Ctrl+Shift+S 截圖辨識</p>
        </div>
      </div>
    )
  }

  return (
    <div className="result-popup">
      {/* Title bar */}
      <div className="popup-titlebar">
        <span className="popup-title">Screenshot OCR</span>
        <div className="popup-controls">
          <button
            className={`control-btn ${isPinned ? 'active' : ''}`}
            onClick={handleTogglePin}
            title="釘選視窗"
          >
            📌
          </button>
          <button
            className="control-btn"
            onClick={onOpenSettings}
            title="設定"
          >
            ⚙️
          </button>
          <button
            className="control-btn close"
            onClick={onClose}
            title="關閉"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="popup-content">
        {/* Image preview */}
        {result?.image && (
          <div className="result-image">
            <img src={result.image} alt="Captured" />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="result-loading">
            <div className="spinner"></div>
            <span>辨識中...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="result-error">
            <span>❌ {error}</span>
          </div>
        )}

        {/* Text result */}
        {!isLoading && !error && result?.text && (
          <div className="result-text" ref={textRef}>
            {result.text}
          </div>
        )}

        {/* Empty result */}
        {!isLoading && !error && result && !result.text && (
          <div className="result-empty">
            <span>未偵測到文字</span>
          </div>
        )}

        {/* Confidence */}
        {result?.confidence !== undefined && (
          <div className="result-confidence">
            信心度: {Math.round(result.confidence)}%
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="popup-actions">
        <button
          className={`action-btn primary ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          disabled={!result?.text}
        >
          {copied ? '✓ 已複製' : '📋 複製全部'}
        </button>
        <button
          className="action-btn"
          onClick={handleSearch}
          disabled={!result?.text}
        >
          🔍 Google 搜尋
        </button>
      </div>

      {/* Hint */}
      {selectedText && (
        <div className="selection-hint">
          已選取 {selectedText.length} 字
        </div>
      )}
    </div>
  )
}
