/**
 * Gemini Vision OCR 模組
 * 使用 Google Gemini 2.0 Flash 進行圖片文字辨識
 * 中文、藝術字體效果都很好
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSettings } from './store'

export interface GeminiOcrResult {
  success: boolean
  text: string
  error?: string
}

let genAI: GoogleGenerativeAI | null = null

/**
 * 取得 Gemini API 實例
 */
function getGenAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI

  const settings = getSettings()
  const apiKey = settings.geminiApiKey

  if (!apiKey) {
    console.log('Gemini API key not configured')
    return null
  }

  genAI = new GoogleGenerativeAI(apiKey)
  return genAI
}

/**
 * 使用 Gemini Vision 辨識圖片文字
 * @param imageData base64 圖片資料 (可帶或不帶 data URL prefix)
 */
export async function recognizeWithGemini(imageData: string): Promise<GeminiOcrResult> {
  const ai = getGenAI()

  if (!ai) {
    return {
      success: false,
      text: '',
      error: 'Gemini API key not configured'
    }
  }

  try {
    // 移除 data URL prefix 並取得 mime type
    let base64Data = imageData
    let mimeType = 'image/png'

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64Data = matches[2]
      }
    }

    console.log('Calling Gemini Vision API...')

    // 使用 Gemini 2.0 Flash（便宜又快）
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      {
        text: '請辨識這張圖片中的所有文字，包括藝術字體、特殊字型。只輸出辨識到的文字內容，不要加任何說明或格式。如果有多行文字，請保持原本的換行格式。'
      }
    ])

    const response = await result.response
    const text = response.text().trim()

    console.log(`Gemini OCR succeeded: "${text.substring(0, 50)}..."`)

    return {
      success: true,
      text
    }

  } catch (error: any) {
    console.error('Gemini OCR error:', error)
    return {
      success: false,
      text: '',
      error: error.message || String(error)
    }
  }
}

/**
 * 檢查 Gemini 是否可用（有設定 API key）
 */
export function isGeminiAvailable(): boolean {
  const settings = getSettings()
  return !!settings.geminiApiKey
}

/**
 * 設定 Gemini API Key
 */
export function setGeminiApiKey(apiKey: string): void {
  // 清除舊的實例
  genAI = null
}
