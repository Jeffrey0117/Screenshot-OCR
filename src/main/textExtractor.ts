/**
 * 統一文字擷取模組
 * 優先順序：UI Automation → Tesseract OCR → (未來: AI Vision)
 */

import { getTextFromRect, UIAutomationResult } from './uiAutomation'
import { recognizeImage, OcrResult } from './ocr'

export type ExtractionMethod = 'ui-automation' | 'tesseract' | 'ai-vision'

export interface ExtractionResult {
  text: string
  method: ExtractionMethod
  confidence: number
  details?: {
    uiAutomation?: UIAutomationResult
    ocr?: OcrResult
  }
}

export interface ExtractionOptions {
  /** 截圖圖片 base64 */
  imageData: string
  /** 選取區域在螢幕上的座標 */
  screenBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** 是否嘗試 UI Automation */
  tryUIAutomation?: boolean
  /** 是否跳過 OCR（只用 UI Automation） */
  skipOCR?: boolean
}

/**
 * 擷取文字 - 自動選擇最佳方法
 */
export async function extractText(options: ExtractionOptions): Promise<ExtractionResult> {
  const {
    imageData,
    screenBounds,
    tryUIAutomation = true,
    skipOCR = false
  } = options

  // 防禦性檢查：確保 imageData 是字串
  if (typeof imageData !== 'string') {
    console.error('extractText: imageData is not a string:', typeof imageData)
    throw new Error(`imageData must be a string, got ${typeof imageData}`)
  }

  // 1. 先嘗試 UI Automation（如果有螢幕座標）
  if (tryUIAutomation && screenBounds) {
    console.log('Trying UI Automation...')

    try {
      const uiaResult = await getTextFromRect(
        screenBounds.x,
        screenBounds.y,
        screenBounds.width,
        screenBounds.height
      )

      if (uiaResult.success && uiaResult.text.length > 0) {
        console.log(`UI Automation succeeded: "${uiaResult.text.substring(0, 50)}..."`)
        return {
          text: uiaResult.text,
          method: 'ui-automation',
          confidence: 100,
          details: { uiAutomation: uiaResult }
        }
      }

      console.log('UI Automation returned no text, falling back to OCR')
    } catch (error) {
      console.log('UI Automation failed:', error)
    }
  }

  // 2. Fallback 到 Tesseract OCR
  if (!skipOCR) {
    console.log('Using Tesseract OCR...')

    try {
      const ocrResult = await recognizeImage(imageData)

      return {
        text: ocrResult.text,
        method: 'tesseract',
        confidence: ocrResult.confidence,
        details: { ocr: ocrResult }
      }
    } catch (error) {
      console.error('OCR failed:', error)
    }
  }

  // 3. 未來：可以加入 AI Vision fallback
  // if (ocrResult.confidence < 70) {
  //   const aiResult = await aiVisionOcr(imageData)
  //   return { text: aiResult.text, method: 'ai-vision', confidence: 95 }
  // }

  return {
    text: '',
    method: 'tesseract',
    confidence: 0
  }
}

/**
 * 取得方法的顯示名稱
 */
export function getMethodDisplayName(method: ExtractionMethod): string {
  switch (method) {
    case 'ui-automation':
      return '直接讀取'
    case 'tesseract':
      return 'OCR 辨識'
    case 'ai-vision':
      return 'AI 辨識'
    default:
      return '未知'
  }
}

/**
 * 格式化信心度顯示
 */
export function formatConfidence(method: ExtractionMethod, confidence: number): string {
  switch (method) {
    case 'ui-automation':
      return '✓ 直接讀取 (100%)'
    case 'tesseract':
      return `OCR 辨識 (${Math.round(confidence)}%)`
    case 'ai-vision':
      return `AI 辨識 (${Math.round(confidence)}%)`
    default:
      return `${Math.round(confidence)}%`
  }
}
