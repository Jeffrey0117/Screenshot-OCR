# OCR 辨識優化設計討論

## 問題分析

目前辨識 `_jane_three` 結果為 `_jano_throe`，信心度 0%，明顯有誤。

### 可能原因
1. **圖片品質** - 截圖解析度、對比度不足
2. **文字樣式** - 特殊字體、斜體、陰影效果
3. **背景干擾** - 深色背景、漸層、雜訊
4. **Tesseract 限制** - 對某些字體辨識能力有限

---

## 優化方案

### 方案 A：圖片預處理 (Image Preprocessing)

在送入 OCR 前對圖片進行處理：

```
原圖 → 灰階化 → 二值化 → 降噪 → 銳化 → OCR
```

#### A1. Canvas 圖片處理（前端）

```typescript
function preprocessImage(imageData: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = img.width * 2  // 放大 2x
      canvas.height = img.height * 2

      // 繪製放大圖片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 取得像素資料
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 灰階化 + 對比度增強 + 二值化
      for (let i = 0; i < data.length; i += 4) {
        // 灰階
        const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114

        // 二值化 (threshold)
        const binary = gray > 128 ? 255 : 0

        data[i] = data[i+1] = data[i+2] = binary
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imageData
  })
}
```

**優點：**
- 純前端實現，無需額外依賴
- 可即時預覽處理效果

**缺點：**
- 處理效果有限
- 需要手動調整 threshold

#### A2. Sharp 圖片處理（後端 - Node.js）

```typescript
import sharp from 'sharp'

async function preprocessWithSharp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: originalWidth * 2 })  // 放大
    .greyscale()                            // 灰階
    .normalize()                            // 正規化對比度
    .sharpen({ sigma: 1.5 })               // 銳化
    .threshold(128)                         // 二值化
    .png()
    .toBuffer()
}
```

**優點：**
- 更強大的圖片處理能力
- 效能更好

**缺點：**
- 需要安裝 native 依賴 (sharp)
- Electron 打包可能有問題

---

### 方案 B：多引擎辨識對比

使用多個 OCR 引擎辨識，取最佳結果：

```
圖片 → Tesseract (eng) ─┬→ 比較信心度 → 選擇最佳結果
     → Tesseract (chi) ─┤
     → Windows OCR ─────┘
```

#### B1. Windows 內建 OCR (UWP API)

```typescript
// 透過 PowerShell 呼叫 Windows OCR
async function windowsOcr(imagePath: string): Promise<string> {
  const script = `
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $bitmap = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync(
      [Windows.Storage.Streams.IRandomAccessStream](
        [System.IO.File]::OpenRead('${imagePath}')
      )
    ).GetAwaiter().GetResult()
    $softwareBitmap = $bitmap.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    $ocrResult = $ocrEngine.RecognizeAsync($softwareBitmap).GetAwaiter().GetResult()
    $ocrResult.Text
  `
  // exec PowerShell...
}
```

**優點：**
- Windows 原生，辨識品質好
- 支援多語言

**缺點：**
- 只能在 Windows 使用
- 需要處理 PowerShell 呼叫

---

### 方案 C：自適應預處理

根據圖片特徵自動選擇預處理策略：

```typescript
interface ImageAnalysis {
  brightness: number      // 平均亮度
  contrast: number        // 對比度
  isDarkBackground: boolean
  hasGradient: boolean
}

function analyzeImage(imageData: ImageData): ImageAnalysis {
  // 分析圖片特徵
}

function selectPreprocessing(analysis: ImageAnalysis): PreprocessingPipeline {
  if (analysis.isDarkBackground) {
    return ['invert', 'contrast', 'threshold']
  }
  if (analysis.hasGradient) {
    return ['denoise', 'adaptiveThreshold']
  }
  return ['sharpen', 'threshold']
}
```

---

### 方案 D：使用者輔助修正

讓使用者可以手動調整預處理參數：

```
┌─────────────────────────────────────┐
│  [原圖預覽]    [處理後預覽]          │
│                                     │
│  亮度:    [====●=====] 50           │
│  對比度:  [======●===] 70           │
│  銳化:    [===●======] 30           │
│  二值化:  [=====●====] 128          │
│                                     │
│  [ ] 反轉顏色                       │
│  [ ] 自動偵測                       │
│                                     │
│  [重新辨識]                         │
└─────────────────────────────────────┘
```

---

## 建議實作順序

### Phase 1 - 基礎優化 (低成本，高效益)
1. **圖片放大** - 將截圖放大 2x 再辨識
2. **灰階處理** - 移除顏色干擾
3. **對比度增強** - 讓文字更清晰

### Phase 2 - 進階優化
1. **自適應二值化** - 根據圖片自動計算 threshold
2. **反色處理** - 深色背景自動反轉
3. **銳化濾鏡** - 增強文字邊緣

### Phase 3 - 進階功能
1. **預處理預覽** - 讓使用者看到處理後的圖片
2. **參數調整 UI** - 手動微調預處理參數
3. **多引擎對比** - 整合 Windows OCR

---

## 快速實作：基礎預處理

建議先實作最簡單的版本：

```typescript
// src/main/imagePreprocess.ts

export async function preprocessForOcr(base64Image: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // 放大 2 倍
      const scale = 2
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // 繪製
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 取得像素
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 計算平均亮度
      let totalBrightness = 0
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i+1] + data[i+2]) / 3
      }
      const avgBrightness = totalBrightness / (data.length / 4)
      const isDark = avgBrightness < 128

      // 處理每個像素
      for (let i = 0; i < data.length; i += 4) {
        // 灰階
        let gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114

        // 深色背景則反轉
        if (isDark) {
          gray = 255 - gray
        }

        // 增強對比度
        gray = ((gray - 128) * 1.5) + 128
        gray = Math.max(0, Math.min(255, gray))

        // 二值化
        const binary = gray > 128 ? 255 : 0

        data[i] = data[i+1] = data[i+2] = binary
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = base64Image
  })
}
```

---

## 結論

建議從 **Phase 1** 開始，實作基礎的圖片預處理：
1. 放大 2x
2. 灰階化
3. 自動偵測深色背景並反轉
4. 對比度增強
5. 二值化

這樣可以顯著提升像 `_jane_three` 這種深色背景白字的辨識率。

如果效果仍不理想，再考慮整合 Windows OCR 或提供手動參數調整 UI。
