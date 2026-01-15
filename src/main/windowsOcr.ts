/**
 * Windows OCR 模組
 * 使用 Windows.Media.Ocr API (透過 PowerShell)
 * 支援多語言，中文效果比 Tesseract 好很多
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execFileAsync = promisify(execFile)

export interface WindowsOcrResult {
  success: boolean
  text: string
  language?: string
  error?: string
}

/**
 * 使用 Windows OCR 辨識圖片
 * @param imageData base64 圖片資料 (可帶或不帶 data URL prefix)
 * @param language 語言代碼 (例如: 'zh-Hant-TW', 'en-US', 'ja-JP')
 */
export async function recognizeWithWindowsOcr(
  imageData: string,
  language?: string
): Promise<WindowsOcrResult> {
  // 移除 data URL prefix
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

  // 建立臨時檔案
  const tempDir = os.tmpdir()
  const tempFile = path.join(tempDir, `ocr_${Date.now()}.png`)

  try {
    // 寫入圖片到臨時檔案
    const imageBuffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(tempFile, imageBuffer)

    // PowerShell 腳本使用 Windows OCR
    const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Helper function to await async operations
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]

Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

# Load required types
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.RandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null

# Get the image file
$imagePath = "${tempFile.replace(/\\/g, '\\\\')}"
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])

# Decode the image
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$softwareBitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

# Create OCR engine
${language ? `
$language = New-Object Windows.Globalization.Language("${language}")
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if ($null -eq $ocrEngine) {
    # Fallback to user profile language
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
` : `
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
`}

if ($null -eq $ocrEngine) {
    Write-Error "Failed to create OCR engine"
    exit 1
}

# Recognize text
$ocrResult = Await ($ocrEngine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult])

# Output result as JSON
$result = @{
    text = $ocrResult.Text
    language = $ocrEngine.RecognizerLanguage.LanguageTag
}

$result | ConvertTo-Json -Compress
`

    // 執行 PowerShell
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psScript
    ], {
      timeout: 30000, // 30 秒超時
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    if (stderr && stderr.trim()) {
      console.error('Windows OCR stderr:', stderr)
    }

    // 解析 JSON 結果
    const jsonOutput = stdout.trim()
    if (!jsonOutput) {
      return {
        success: false,
        text: '',
        error: 'No output from Windows OCR'
      }
    }

    const result = JSON.parse(jsonOutput)

    return {
      success: true,
      text: result.text || '',
      language: result.language
    }

  } catch (error: any) {
    console.error('Windows OCR error:', error)
    return {
      success: false,
      text: '',
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
 * 檢查 Windows OCR 是否可用
 */
export async function isWindowsOcrAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false
  }

  try {
    const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -ne $engine) { Write-Output "available" } else { Write-Output "unavailable" }
`

    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psScript
    ], { timeout: 10000 })

    return stdout.trim() === 'available'
  } catch {
    return false
  }
}

/**
 * 取得可用的 Windows OCR 語言
 */
export async function getAvailableLanguages(): Promise<string[]> {
  if (process.platform !== 'win32') {
    return []
  }

  try {
    const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
$languages = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
$languages | ForEach-Object { $_.LanguageTag }
`

    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psScript
    ], { timeout: 10000 })

    return stdout.trim().split('\n').map(s => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}
