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
  onInstagram: (text: string) => void
  onClose: () => void
  onTogglePin: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  onRecrop?: (croppedImage: string) => void
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
  onRecrop
}: ResultPopupProps) {
  const [isPinned, setIsPinned] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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
          className={`control-btn ${isPinned ? 'active' : ''}`}
          onClick={handleTogglePin}
          title="釘選視窗"
        >
          📌
        </button>
        <button
          className="control-btn"
          onClick={onOpenHistory}
          title="歷史紀錄"
        >
          🕒
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
  )

  // No result yet
  if (!result && !isLoading && !error) {
    return (
      <div className="result-popup empty">
        {titleBar}
        <div className="empty-content">
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <p>按 Ctrl+Shift+S 截圖辨識</p>
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
        {isEditing ? (
          <>
            <button
              className="action-btn primary"
              onClick={handleApplyCrop}
              disabled={!cropStart || !cropEnd}
            >
              ✓ 確認裁切
            </button>
            <button
              className="action-btn"
              onClick={handleCancelCrop}
            >
              ✕ 取消
            </button>
          </>
        ) : (
          <>
            <button
              className={`action-btn primary ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              disabled={!result?.text}
            >
              {copied ? '✓ 已複製' : '📋 複製'}
            </button>
            <button
              className="action-btn"
              onClick={() => setIsEditing(true)}
              disabled={!result?.image || isLoading}
              title="重新框選區域"
            >
              ✂️ 裁切
            </button>
            <button
              className="action-btn"
              onClick={handleSearch}
              disabled={!result?.text}
            >
              🔍
            </button>
            <button
              className="action-btn instagram"
              onClick={() => onInstagram(selectedText || result?.text || '')}
              disabled={!result?.text}
            >
              📷
            </button>
          </>
        )}
      </div>

      {/* Hint */}
      {isEditing && (
        <div className="selection-hint editing-hint">
          拖曳選取要辨識的區域
        </div>
      )}
      {selectedText && !isEditing && (
        <div className="selection-hint">
          已選取 {selectedText.length} 字
        </div>
      )}
    </div>
  )
}
