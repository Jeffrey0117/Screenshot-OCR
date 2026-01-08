/**
 * 統一文字擷取模組
 * 預設順序：UI Automation → PaddleOCR → Tesseract OCR
 * Gemini AI 需要手動觸發（useGemini: true）
 */

import { getTextFromRect, UIAutomationResult } from './uiAutomation'
import { recognizeImage, OcrResult } from './ocr'
import { recognizeWithPaddleOcr, PaddleOcrResult } from './paddleOcr'
import { recognizeWithGemini, isGeminiAvailable, GeminiOcrResult } from './geminiOcr'

export type ExtractionMethod = 'ui-automation' | 'gemini-ai' | 'paddle-ocr' | 'tesseract'

export interface ExtractionResult {
  text: string
  method: ExtractionMethod
  confidence: number
  details?: {
    uiAutomation?: UIAutomationResult
    ocr?: OcrResult
    paddleOcr?: PaddleOcrResult
    geminiOcr?: GeminiOcrResult
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
  /** 是否使用 Gemini AI（需手動觸發） */
  useGemini?: boolean
}

/**
 * 擷取文字 - 自動選擇最佳方法
 */
export async function extractText(options: ExtractionOptions): Promise<ExtractionResult> {
  const {
    imageData,
    screenBounds,
    tryUIAutomation = true,
    skipOCR = false,
    useGemini = false
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

  // 2. 嘗試 Gemini AI（只有手動觸發時才用）
  if (!skipOCR && useGemini && isGeminiAvailable()) {
    console.log('Trying Gemini AI Vision...')

    try {
      const geminiResult = await recognizeWithGemini(imageData)

      if (geminiResult.success && geminiResult.text.length > 0) {
        console.log(`Gemini AI succeeded: "${geminiResult.text.substring(0, 50)}..."`)
        return {
          text: geminiResult.text,
          method: 'gemini-ai',
          confidence: 98, // AI 辨識信心度高
          details: { geminiOcr: geminiResult }
        }
      }

      console.log('Gemini AI returned no text, falling back to PaddleOCR')
    } catch (error) {
      console.log('Gemini AI failed:', error)
    }
  }

  // 3. 嘗試 PaddleOCR（中文效果比 Tesseract 好）
  if (!skipOCR) {
    console.log('Trying PaddleOCR...')

    try {
      const paddleResult = await recognizeWithPaddleOcr(imageData)

      if (paddleResult.success && paddleResult.text.length > 0) {
        // 計算平均信心度
        const avgConfidence = paddleResult.lines.length > 0
          ? paddleResult.lines.reduce((sum, l) => sum + l.confidence, 0) / paddleResult.lines.length * 100
          : 90

        console.log(`PaddleOCR succeeded: "${paddleResult.text.substring(0, 50)}..."`)
        return {
          text: paddleResult.text,
          method: 'paddle-ocr',
          confidence: avgConfidence,
          details: { paddleOcr: paddleResult }
        }
      }

      console.log('PaddleOCR returned no text, falling back to Tesseract')
    } catch (error) {
      console.log('PaddleOCR failed:', error)
    }
  }

  // 3. Fallback 到 Tesseract OCR
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
 * 使用 Gemini AI 重新辨識（手動觸發）
 */
export async function extractWithGemini(imageData: string): Promise<ExtractionResult> {
  if (!isGeminiAvailable()) {
    return {
      text: '',
      method: 'gemini-ai',
      confidence: 0,
      details: { geminiOcr: { success: false, text: '', error: 'Gemini API key not configured' } }
    }
  }

  console.log('Manual Gemini AI Vision...')
  const geminiResult = await recognizeWithGemini(imageData)

  if (geminiResult.success && geminiResult.text.length > 0) {
    return {
      text: geminiResult.text,
      method: 'gemini-ai',
      confidence: 98,
      details: { geminiOcr: geminiResult }
    }
  }

  return {
    text: '',
    method: 'gemini-ai',
    confidence: 0,
    details: { geminiOcr: geminiResult }
  }
}

/**
 * 取得方法的顯示名稱
 */
export function getMethodDisplayName(method: ExtractionMethod): string {
  switch (method) {
    case 'ui-automation':
      return '直接讀取'
    case 'gemini-ai':
      return 'Gemini AI'
    case 'paddle-ocr':
      return 'PaddleOCR'
    case 'tesseract':
      return 'Tesseract OCR'
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
    case 'gemini-ai':
      return `Gemini AI (${Math.round(confidence)}%)`
    case 'paddle-ocr':
      return `PaddleOCR (${Math.round(confidence)}%)`
    case 'tesseract':
      return `Tesseract OCR (${Math.round(confidence)}%)`
    default:
      return `${Math.round(confidence)}%`
  }
}
