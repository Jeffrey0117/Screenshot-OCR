import { useState, useRef, useCallback, useEffect } from 'react'
import '../styles/ScreenCapture.css'

interface ScreenCaptureProps {
  screenshot: string
  onComplete: (imageData: string) => void
  onCancel: () => void
}

interface SelectionRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function ScreenCapture({ screenshot, onComplete, onCancel }: ScreenCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load screenshot image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      drawCanvas()
    }
    img.src = screenshot
  }, [screenshot])

  // Draw canvas with overlay
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match window
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Draw screenshot
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // If selection exists, clear the selected area to show original image
    if (selection) {
      const x = Math.min(selection.startX, selection.endX)
      const y = Math.min(selection.startY, selection.endY)
      const width = Math.abs(selection.endX - selection.startX)
      const height = Math.abs(selection.endY - selection.startY)

      if (width > 0 && height > 0) {
        // Clear overlay in selection area
        ctx.clearRect(x, y, width, height)
        // Redraw original image in selection area
        const scaleX = img.width / canvas.width
        const scaleY = img.height / canvas.height
        ctx.drawImage(
          img,
          x * scaleX, y * scaleY, width * scaleX, height * scaleY,
          x, y, width, height
        )

        // Draw selection border
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(x, y, width, height)

        // Draw size indicator
        ctx.setLineDash([])
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(x, y - 24, 80, 20)
        ctx.fillStyle = '#fff'
        ctx.font = '12px sans-serif'
        ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + 5, y - 8)
      }
    }
  }, [selection])

  // Redraw when selection changes
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [selection, imageLoaded, drawCanvas])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Right click to cancel
    if (e.button === 2) {
      onCancel()
      return
    }
    setIsSelecting(true)
    setSelection({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY
    })
  }

  // Handle right click (context menu)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onCancel()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selection) return
    setSelection({
      ...selection,
      endX: e.clientX,
      endY: e.clientY
    })
  }

  const handleMouseUp = () => {
    if (!isSelecting || !selection) return
    setIsSelecting(false)

    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    // Minimum selection size
    if (width < 10 || height < 10) {
      setSelection(null)
      return
    }

    // Capture the selected region
    captureRegion()
  }

  // Capture the selected region
  const captureRegion = () => {
    if (!selection || !imageRef.current) return

    const img = imageRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = Math.min(selection.startX, selection.endX)
    const y = Math.min(selection.startY, selection.endY)
    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    // Scale coordinates to original image size
    const scaleX = img.width / window.innerWidth
    const scaleY = img.height / window.innerHeight

    canvas.width = width * scaleX
    canvas.height = height * scaleY

    ctx.drawImage(
      img,
      x * scaleX, y * scaleY, width * scaleX, height * scaleY,
      0, 0, canvas.width, canvas.height
    )

    const imageData = canvas.toDataURL('image/png')
    onComplete(imageData)
  }

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter' && selection) {
        captureRegion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selection, onCancel])

  return (
    <div className="screen-capture">
      <canvas
        ref={canvasRef}
        className="capture-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      <div className="capture-instructions">
        <span>拖曳選取區域</span>
        <span className="shortcut">右鍵 / ESC 取消</span>
      </div>
    </div>
  )
}
