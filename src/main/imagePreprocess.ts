/* eslint-disable @typescript-eslint/no-explicit-any */
import { Jimp } from 'jimp'

/**
 * 圖片預處理選項
 */
export interface PreprocessOptions {
  scale?: number
  grayscale?: boolean
  invert?: boolean | 'auto'
  contrast?: number
  threshold?: number
  sharpen?: boolean
}

/**
 * 預處理圖片以提升 OCR 辨識率
 */
export async function preprocessImage(
  base64Image: string,
  options?: PreprocessOptions
): Promise<string> {
  const opts = {
    scale: options?.scale ?? 3,
    grayscale: options?.grayscale ?? true,
    invert: options?.invert ?? 'auto' as boolean | 'auto',
    contrast: options?.contrast ?? 2.0,
    threshold: options?.threshold ?? 128,
    sharpen: options?.sharpen ?? true,
  }

  // 移除 data URI 前綴
  let pureBase64 = base64Image
  if (base64Image.includes(',')) {
    pureBase64 = base64Image.split(',')[1]
  }

  const buffer = Buffer.from(pureBase64, 'base64')
  let image: any = await Jimp.read(buffer)

  const originalSize = { w: image.width, h: image.height }

  // 放大圖片
  if (opts.scale !== 1) {
    const newWidth = image.width * opts.scale
    const newHeight = image.height * opts.scale
    image = image.resize({ w: newWidth, h: newHeight })
  }

  // 過濾彩色像素（如游標），只保留接近灰階的像素
  // 這可以去除綠色游標等干擾
  image.scan((_x: number, _y: number, idx: number) => {
    const r = image.bitmap.data[idx + 0]
    const g = image.bitmap.data[idx + 1]
    const b = image.bitmap.data[idx + 2]

    // 計算顏色的飽和度 - 如果顏色太鮮豔（非灰階），視為雜訊
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max === 0 ? 0 : (max - min) / max

    // 如果飽和度高（彩色），將其變為白色（背景）
    if (saturation > 0.3) {
      image.bitmap.data[idx + 0] = 255
      image.bitmap.data[idx + 1] = 255
      image.bitmap.data[idx + 2] = 255
    }
  })

  // 轉灰階
  if (opts.grayscale) {
    image = image.greyscale()
  }

  // 計算平均亮度
  let totalBrightness = 0
  const pixelCount = image.width * image.height

  image.scan((_x: number, _y: number, idx: number) => {
    const r = image.bitmap.data[idx + 0]
    const g = image.bitmap.data[idx + 1]
    const b = image.bitmap.data[idx + 2]
    totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b
  })

  const avgBrightness = totalBrightness / pixelCount

  // 自動偵測深色背景並反轉
  let shouldInvert = false
  if (opts.invert === 'auto') {
    shouldInvert = avgBrightness < 128
    console.log(`Preprocess: avg brightness=${avgBrightness.toFixed(1)}, invert=${shouldInvert}`)
  } else {
    shouldInvert = opts.invert
  }

  if (shouldInvert) {
    image = image.invert()
  }

  // 增強對比度
  if (opts.contrast !== 1) {
    const contrastValue = Math.min(1, Math.max(-1, opts.contrast - 1))
    image = image.contrast(contrastValue)
  }

  // 銳化處理 - 使用卷積核強化邊緣，有助於辨識細線如底線
  if (opts.sharpen) {
    // Jimp 的 convolute 方法可能存在，嘗試使用
    // 如果不存在則手動處理
    try {
      // 銳化卷積核 (3x3)
      const sharpenKernel = [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
      ]
      if (typeof image.convolute === 'function') {
        image = image.convolute(sharpenKernel)
        console.log('Preprocess: Applied sharpening')
      }
    } catch (e) {
      console.log('Preprocess: Sharpening not available')
    }
  }

  // 二值化處理 - 將圖片轉為純黑白，消除背景雜訊
  // 使用自適應閾值：根據圖片亮度決定閾值
  if (opts.threshold > 0) {
    // 計算當前圖片的亮度分佈來決定最佳閾值
    let brightPixels = 0
    let darkPixels = 0

    image.scan((_x: number, _y: number, idx: number) => {
      const gray = image.bitmap.data[idx]
      if (gray > 200) brightPixels++
      else if (gray < 50) darkPixels++
    })

    // 如果大部分是亮色（反轉後的白底），使用較高閾值保留文字
    const totalPixels = image.width * image.height
    const brightRatio = brightPixels / totalPixels

    // 動態調整閾值：白底黑字用較低閾值，保留更多細節
    const adaptiveThreshold = brightRatio > 0.5 ? 180 : 128

    console.log(`Preprocess: bright ratio=${(brightRatio * 100).toFixed(1)}%, threshold=${adaptiveThreshold}`)

    // 手動二值化
    image.scan((_x: number, _y: number, idx: number) => {
      const gray = image.bitmap.data[idx]
      const newValue = gray > adaptiveThreshold ? 255 : 0
      image.bitmap.data[idx + 0] = newValue
      image.bitmap.data[idx + 1] = newValue
      image.bitmap.data[idx + 2] = newValue
    })
  }

  const newSize = { w: image.width, h: image.height }
  console.log(`Preprocess: ${originalSize.w}x${originalSize.h} -> ${newSize.w}x${newSize.h}`)

  // 輸出為 base64
  const outputBase64 = await image.getBase64('image/png')

  return outputBase64
}

export default preprocessImage
