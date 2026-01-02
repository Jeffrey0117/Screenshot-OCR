import Tesseract from 'tesseract.js'
import path from 'path'
import { app } from 'electron'

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

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * Get tessdata path based on environment
 */
function getTessdataPath(): string {
  if (isDev) {
    return path.join(__dirname, '../../assets/tessdata')
  }
  return path.join(process.resourcesPath, 'tessdata')
}

/**
 * Initialize OCR worker
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
  const tessdataPath = getTessdataPath()

  try {
    worker = await Tesseract.createWorker(langString, 1, {
      langPath: tessdataPath,
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
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
    // Convert data URL to buffer if needed
    let imageBuffer: string | Buffer = imageData
    if (imageData.startsWith('data:')) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      imageBuffer = Buffer.from(base64Data, 'base64')
    }

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
 * Check if two arrays are equal
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}
