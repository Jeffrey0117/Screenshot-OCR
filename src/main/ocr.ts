import Tesseract from 'tesseract.js'
import { preprocessImage } from './imagePreprocess'
import { getSettings } from './store'

export interface OcrResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    bbox: { x0: number; y0: number; x1: number; y1: number }
    confidence: number
  }>
}

let worker: Tesseract.Worker | null = null
let currentLanguages: string[] = []

/**
 * Initialize OCR worker
 * Tesseract.js 5.x automatically downloads language files from CDN
 */
export async function initOcr(languages: string[] = ['eng', 'chi_tra']): Promise<void> {
  // If worker exists with same languages, skip
  if (worker && arraysEqual(currentLanguages, languages)) {
    return
  }

  // Terminate existing worker
  if (worker) {
    await worker.terminate()
    worker = null
  }

  console.log('Initializing OCR with languages:', languages)

  const langString = languages.join('+')

  try {
    // Tesseract.js 5.x will auto-download language data from CDN
    worker = await Tesseract.createWorker(langString, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        } else {
          console.log(`OCR: ${m.status}`)
        }
      }
    })

    currentLanguages = [...languages]
    console.log('OCR initialized successfully')
  } catch (error) {
    console.error('Failed to initialize OCR:', error)
    throw error
  }
}

/**
 * Recognize text from image
 */
export async function recognizeImage(imageData: string): Promise<OcrResult> {
  if (!worker) {
    throw new Error('OCR not initialized. Call initOcr() first.')
  }

  console.log('Starting OCR recognition...')

  try {
    // Preprocess image if enabled
    const settings = getSettings()
    let processedImage = imageData

    if (settings.preprocessEnabled !== false) {
      console.log('Preprocessing image...')
      processedImage = await preprocessImage(imageData, {
        scale: 2,           // 放大 2 倍（太大會造成幻覺）
        grayscale: true,
        invert: settings.preprocessAutoInvert !== false ? 'auto' : false,
        contrast: 1.5,      // 適中對比度
        threshold: 0,       // 關閉二值化，避免幻覺
        sharpen: false      // 關閉銳化，避免雜訊
      })
    }

    // Convert data URL to buffer if needed
    let imageBuffer: string | Buffer = processedImage
    if (processedImage.startsWith('data:')) {
      const base64Data = processedImage.replace(/^data:image\/\w+;base64,/, '')
      imageBuffer = Buffer.from(base64Data, 'base64')
    }

    // Set Tesseract parameters for better character recognition
    await worker.setParameters({
      tessedit_char_whitelist: '', // Allow all characters
      preserve_interword_spaces: '1',
    })

    const result = await worker.recognize(imageBuffer)

    const words = result.data.words?.map(w => ({
      text: w.text,
      bbox: w.bbox,
      confidence: w.confidence
    })) || []

    console.log(`OCR complete. Found ${words.length} words.`)

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      words
    }
  } catch (error) {
    console.error('OCR recognition failed:', error)
    throw error
  }
}

/**
 * Change OCR languages
 */
export async function setOcrLanguages(languages: string[]): Promise<void> {
  await initOcr(languages)
}

/**
 * Terminate OCR worker
 */
export async function terminateOcr(): Promise<void> {
  if (worker) {
    console.log('Terminating OCR worker...')
    await worker.terminate()
    worker = null
    currentLanguages = []
    console.log('OCR worker terminated')
  }
}

/**
 * Cancel ongoing OCR operation
 * Note: Tesseract.js doesn't have a direct cancel, so we terminate and reinit
 */
export async function cancelOcr(): Promise<void> {
  console.log('Cancelling OCR...')
  await terminateOcr()
  // Worker will be reinitialized on next recognition
}

/**
 * Check if two arrays are equal
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}
