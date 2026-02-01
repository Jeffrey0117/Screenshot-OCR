import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import '../styles/ResultPopup.css'

interface OcrResult {
  image: string
  text: string
  confidence?: number
  method?: string
  methodDisplay?: string
}

interface ResultPopupProps {
  result: OcrResult | null
  isLoading: boolean
  error: string | null
  onCopy: (text: string) => void
  onSearch: (text: string) => void
  onInstagram: (text: string) => void
  onClose: () => void
  onTogglePin: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  onCapture: () => void
  onCancelOcr?: () => void
  onRecrop?: (croppedImage: string) => void
  onTextEdit?: (newText: string) => void
  onGeminiOcr?: (imageData: string) => void
}

export function ResultPopup({
  result,
  isLoading,
  error,
  onCopy,
  onSearch,
  onInstagram,
  onClose,
  onTogglePin,
  onOpenSettings,
  onOpenHistory,
  onCapture,
  onCancelOcr,
  onRecrop,
  onTextEdit,
  onGeminiOcr
}: ResultPopupProps) {
  const { t } = useLanguage()
  const [isPinned, setIsPinned] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  // Crop handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropStart({ x, y })
    setCropEnd({ x, y })
    setIsDragging(true)
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !isEditing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setCropEnd({ x, y })
  }

  const handleCropMouseUp = () => {
    setIsDragging(false)
  }

  const handleApplyCrop = () => {
    if (!cropStart || !cropEnd || !result?.image || !imageRef.current || !canvasRef.current) return

    const img = imageRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate crop area relative to actual image size
    const displayWidth = img.clientWidth
    const displayHeight = img.clientHeight
    const scaleX = img.naturalWidth / displayWidth
    const scaleY = img.naturalHeight / displayHeight

    const x1 = Math.min(cropStart.x, cropEnd.x) * scaleX
    const y1 = Math.min(cropStart.y, cropEnd.y) * scaleY
    const x2 = Math.max(cropStart.x, cropEnd.x) * scaleX
    const y2 = Math.max(cropStart.y, cropEnd.y) * scaleY

    const cropWidth = x2 - x1
    const cropHeight = y2 - y1

    if (cropWidth < 10 || cropHeight < 10) {
      setIsEditing(false)
      setCropStart(null)
      setCropEnd(null)
      return
    }

    canvas.width = cropWidth
    canvas.height = cropHeight
    ctx.drawImage(img, x1, y1, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

    const croppedImage = canvas.toDataURL('image/png')
    setIsEditing(false)
    setCropStart(null)
    setCropEnd(null)

    if (onRecrop) {
      onRecrop(croppedImage)
    }
  }

  const handleCancelCrop = () => {
    setIsEditing(false)
    setCropStart(null)
    setCropEnd(null)
  }

  // Get crop rectangle style
  const getCropRectStyle = () => {
    if (!cropStart || !cropEnd) return {}
    const left = Math.min(cropStart.x, cropEnd.x)
    const top = Math.min(cropStart.y, cropEnd.y)
    const width = Math.abs(cropEnd.x - cropStart.x)
    const height = Math.abs(cropEnd.y - cropStart.y)
    return { left, top, width, height }
  }

  // Title bar component (shared between empty and result states)
  const titleBar = (
    <div className="popup-titlebar">
      <div className="popup-title-left">
        <img src="/icon.png" alt="Logo" className="popup-logo" />
        <span className="popup-title">Screenshot OCR</span>
      </div>
      <div className="popup-controls">
        <button
          className="control-btn capture"
          onClick={onCapture}
          title={t('result.capture')}
        >
          📷 {t('result.capture')}
        </button>
        <button
          className={`control-btn ${isPinned ? 'active' : ''}`}
          onClick={handleTogglePin}
          title={t('result.pinTooltip')}
        >
          📌 {t('result.pin')}
        </button>
        <button
          className="control-btn"
          onClick={onOpenHistory}
          title={t('result.historyTooltip')}
        >
          📜 {t('result.history')}
        </button>
        <button
          className="control-btn"
          onClick={onOpenSettings}
          title={t('result.settingsTooltip')}
        >
          ⚙️ {t('result.settings')}
        </button>
        <button
          className="control-btn close"
          onClick={onClose}
          title={t('result.close')}
        >
          ✕
        </button>
      </div>
    </div>
  )

  // No result yet
  if (!result && !isLoading && !error) {
    return (
      <div className="result-popup empty">
        {titleBar}
        <div className="empty-content">
          <div className="empty-state">
            <img className="empty-icon-img" src="/icon.png" alt="Screenshot OCR" />
            <p>{t('result.emptyHint')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="result-popup">
      {titleBar}

      {/* Content */}
      <div className="popup-content">
        {/* Image preview with crop functionality */}
        {result?.image && (
          <div
            className={`result-image ${isEditing ? 'editing' : ''}`}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
          >
            <img ref={imageRef} src={result.image} alt="Captured" draggable={false} />
            {isEditing && cropStart && cropEnd && (
              <>
                <div className="crop-overlay" />
                <div className="crop-rect" style={getCropRectStyle()} />
              </>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="result-loading">
            <div className="spinner"></div>
            <span>{t('result.recognizing')}</span>
            {onCancelOcr && (
              <div className="loading-actions">
                <button className="cancel-btn" onClick={onCancelOcr}>
                  {t('result.cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="result-error">
            <span>{error}</span>
          </div>
        )}

        {/* Text result - editable */}
        {!isLoading && !error && result && (
          <div className="result-text-wrapper">
            <div
              className={`result-text ${isTextExpanded ? 'expanded' : ''}`}
              ref={textRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onBlur={(e) => {
                const newText = e.currentTarget.textContent || ''
                if (newText !== result.text && onTextEdit) {
                  onTextEdit(newText)
                }
              }}
              data-placeholder={t('result.placeholder')}
            >
              {result.text || ''}
            </div>
            {result.text && result.text.length > 100 && (
              <button
                className="expand-btn"
                onClick={() => setIsTextExpanded(!isTextExpanded)}
              >
                {isTextExpanded ? `▲ ${t('result.collapse')}` : `▼ ${t('result.expand')}`}
              </button>
            )}
          </div>
        )}

        {/* Method & Confidence */}
        {result && !isLoading && (
          <div className="result-confidence">
            {result.methodDisplay || (result.confidence !== undefined ? `${t('result.confidence')}: ${Math.round(result.confidence)}%` : '')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="popup-actions">
        {isEditing ? (
          <>
            <button
              className="action-btn primary"
              onClick={handleApplyCrop}
              disabled={!cropStart || !cropEnd}
            >
              ✓ {t('result.confirmCrop')}
            </button>
            <button
              className="action-btn"
              onClick={handleCancelCrop}
            >
              ✕ {t('result.cancelCrop')}
            </button>
          </>
        ) : (
          <>
            <button
              className={`action-btn primary ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              disabled={!result?.text}
            >
              {copied ? `✓ ${t('result.copied')}` : `📋 ${t('result.copy')}`}
            </button>
            <button
              className="action-btn"
              onClick={() => setIsEditing(true)}
              disabled={!result?.image || isLoading}
              title={t('result.cropTooltip')}
            >
              ✂️ {t('result.crop')}
            </button>
            {onGeminiOcr && (
              <button
                className="action-btn ai"
                onClick={() => result?.image && onGeminiOcr(result.image)}
                disabled={!result?.image || isLoading}
                title={t('result.aiTooltip')}
              >
                🤖 AI
              </button>
            )}
            <button
              className="action-btn"
              onClick={handleSearch}
              disabled={!result?.text}
            >
              🔍 {t('result.search')}
            </button>
            <button
              className="action-btn instagram"
              onClick={() => onInstagram(selectedText || result?.text || '')}
              disabled={!result?.text}
            >
              📷 IG
            </button>
          </>
        )}
      </div>

      {/* Hint */}
      {isEditing && (
        <div className="selection-hint editing-hint">
          {t('result.editHint')}
        </div>
      )}
      {selectedText && !isEditing && (
        <div className="selection-hint">
          {t('result.selectedHint').replace('{count}', String(selectedText.length))}
        </div>
      )}
    </div>
  )
}
