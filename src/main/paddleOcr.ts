/**
 * PaddleOCR 模組
 * 使用 @gutenye/ocr-node (基於 PaddleOCR + ONNX runtime)
 * 中文辨識效果比 Tesseract 好很多
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface PaddleOcrResult {
  success: boolean
  text: string
  lines: Array<{
    text: string
    confidence: number
    box: { top: number; left: number; width: number; height: number }
  }>
  error?: string
}

let ocrInstance: any = null
let isInitializing = false

/**
 * 初始化 PaddleOCR
 */
async function getOcrInstance(): Promise<any> {
  if (ocrInstance) {
    return ocrInstance
  }

  if (isInitializing) {
    // 等待初始化完成
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return ocrInstance
  }

  isInitializing = true

  try {
    console.log('Initializing PaddleOCR...')
    // Dynamic import for ESM module
    const { default: Ocr } = await import('@gutenye/ocr-node')
    ocrInstance = await Ocr.create()
    console.log('PaddleOCR initialized successfully')
    return ocrInstance
  } catch (error) {
    console.error('Failed to initialize PaddleOCR:', error)
    throw error
  } finally {
    isInitializing = false
  }
}

/**
 * 使用 PaddleOCR 辨識圖片
 * @param imageData base64 圖片資料 (可帶或不帶 data URL prefix)
 */
export async function recognizeWithPaddleOcr(imageData: string): Promise<PaddleOcrResult> {
  // 移除 data URL prefix
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

  // 建立臨時檔案 (PaddleOCR 需要檔案路徑)
  const tempDir = os.tmpdir()
  const tempFile = path.join(tempDir, `paddle_ocr_${Date.now()}.png`)

  try {
    // 寫入圖片到臨時檔案
    const imageBuffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(tempFile, imageBuffer)

    // 取得 OCR instance
    const ocr = await getOcrInstance()

    // 執行辨識
    console.log('Running PaddleOCR detection...')
    const result = await ocr.detect(tempFile)

    // 解析結果
    const lines = result.lines?.map((line: any) => ({
      text: line.text || '',
      confidence: line.confidence || 0,
      box: line.frame || { top: 0, left: 0, width: 0, height: 0 }
    })) || []

    // 組合所有文字
    const fullText = lines.map((l: any) => l.text).join('\n')

    console.log(`PaddleOCR complete. Found ${lines.length} lines.`)

    return {
      success: true,
      text: fullText,
      lines
    }

  } catch (error: any) {
    console.error('PaddleOCR error:', error)
    return {
      success: false,
      text: '',
      lines: [],
      error: error.message || String(error)
    }
  } finally {
    // 清理臨時檔案
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch (e) {
      // 忽略清理錯誤
    }
  }
}

/**
 * 檢查 PaddleOCR 是否可用
 */
export async function isPaddleOcrAvailable(): Promise<boolean> {
  try {
    await getOcrInstance()
    return true
  } catch {
    return false
  }
}

/**
 * 終止 PaddleOCR (釋放資源)
 */
export async function terminatePaddleOcr(): Promise<void> {
  if (ocrInstance) {
    console.log('Terminating PaddleOCR...')
    // 目前 @gutenye/ocr-node 沒有明確的 terminate 方法
    ocrInstance = null
    console.log('PaddleOCR terminated')
  }
}
