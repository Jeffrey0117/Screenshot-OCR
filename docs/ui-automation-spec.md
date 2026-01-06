# Screenshot OCR - UI Automation 文字擷取規格

## 概念

使用 Windows UI Automation API 直接讀取視窗內的文字元素，完全繞過 OCR。

```
使用者框選區域 → 偵測視窗 → UI Automation 讀取文字 → 直接輸出
                              ↓
                         失敗 fallback → Tesseract OCR / AI Vision
```

## 優勢

| 方案 | 準確度 | 速度 | 成本 | 適用場景 |
|------|--------|------|------|----------|
| Tesseract OCR | 60-80% | 快 | $0 | 一般文字 |
| AI Vision | 95%+ | 慢 | $0.005/次 | 特殊字體 |
| **UI Automation** | **100%** | **極快** | **$0** | **任何標準視窗** |

## 技術架構

### 1. 核心流程

```
┌─────────────────────────────────────────────────────────────┐
│ 使用者按快捷鍵 → 截圖 → 框選區域                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. 根據框選座標，找到對應的視窗 handle                        │
│    - EnumWindows + GetWindowRect                            │
│    - 找到包含該區域的最上層視窗                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 使用 UI Automation 遍歷該區域內的元素                     │
│    - IUIAutomation::ElementFromPoint                        │
│    - 遍歷 TextPattern / ValuePattern                        │
│    - 收集所有文字內容                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 成功 → 直接返回文字                                       │
│    失敗 → Fallback 到 OCR                                   │
└─────────────────────────────────────────────────────────────┘
```

### 2. 支援的應用程式

**高度支援（100% 準確）：**
- Chrome / Edge / Firefox 瀏覽器
- VS Code / Visual Studio
- 記事本 / Word / Excel
- Slack / Discord / Teams
- 檔案總管

**部分支援：**
- 遊戲內 UI（取決於實作方式）
- 自訂繪製的應用程式

**不支援（fallback 到 OCR）：**
- 圖片內的文字
- PDF 閱讀器（部分）
- 遠端桌面視窗內容

### 3. Node.js 實作方式

#### 選項 A: node-ffi-napi（推薦）

```javascript
const ffi = require('ffi-napi');
const ref = require('ref-napi');

// 載入 Windows API
const user32 = ffi.Library('user32', {
  'GetForegroundWindow': ['pointer', []],
  'GetWindowRect': ['bool', ['pointer', 'pointer']],
  'WindowFromPoint': ['pointer', ['int', 'int']],
});

const oleacc = ffi.Library('oleacc', {
  'AccessibleObjectFromWindow': ['long', ['pointer', 'uint', 'pointer', 'pointer']],
});
```

#### 選項 B: C++ Native Addon

```cpp
// binding.gyp 配置 + node-addon-api
#include <UIAutomation.h>

Napi::String GetTextFromPoint(const Napi::CallbackInfo& info) {
  int x = info[0].As<Napi::Number>().Int32Value();
  int y = info[1].As<Napi::Number>().Int32Value();

  IUIAutomation* pAutomation;
  CoCreateInstance(CLSID_CUIAutomation, NULL, CLSCTX_INPROC_SERVER,
                   IID_IUIAutomation, (void**)&pAutomation);

  IUIAutomationElement* pElement;
  POINT pt = { x, y };
  pAutomation->ElementFromPoint(pt, &pElement);

  // 取得 TextPattern 或 ValuePattern
  // ...
}
```

#### 選項 C: PowerShell 橋接

```javascript
const { exec } = require('child_process');

function getTextFromRect(x, y, width, height) {
  return new Promise((resolve, reject) => {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      $auto = [System.Windows.Automation.AutomationElement]
      $point = New-Object System.Windows.Point(${x}, ${y})
      $element = $auto::FromPoint($point)
      $element.Current.Name
    `;

    exec(`powershell -Command "${script}"`, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}
```

### 4. 整合到現有架構

```typescript
// src/main/textExtractor.ts

interface ExtractionResult {
  text: string;
  method: 'ui-automation' | 'tesseract' | 'ai-vision';
  confidence: number;
}

export async function extractText(
  imageData: string,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<ExtractionResult> {

  // 1. 先嘗試 UI Automation
  try {
    const uiaText = await getTextFromUIAutomation(bounds);
    if (uiaText && uiaText.length > 0) {
      return {
        text: uiaText,
        method: 'ui-automation',
        confidence: 100,
      };
    }
  } catch (err) {
    console.log('UI Automation failed, falling back to OCR');
  }

  // 2. Fallback 到 Tesseract OCR
  try {
    const ocrResult = await tesseractOcr(imageData);
    if (ocrResult.confidence > 70) {
      return {
        text: ocrResult.text,
        method: 'tesseract',
        confidence: ocrResult.confidence,
      };
    }
  } catch (err) {
    console.log('Tesseract failed, falling back to AI Vision');
  }

  // 3. 最後用 AI Vision（最貴但最準）
  const aiResult = await aiVisionOcr(imageData);
  return {
    text: aiResult.text,
    method: 'ai-vision',
    confidence: 95,
  };
}
```

### 5. UI 顯示

在結果視窗顯示使用的方法：

```
┌─────────────────────────────────────────┐
│ Screenshot OCR                    📌 ✕ │
├─────────────────────────────────────────┤
│ [截圖預覽]                              │
├─────────────────────────────────────────┤
│ linlinya_1214                           │
│                                         │
│ ✓ 直接讀取 (100% 準確)                  │  ← 顯示方法
├─────────────────────────────────────────┤
│ [📋複製] [✂️裁切] [🔍] [📷]              │
└─────────────────────────────────────────┘
```

信心度顯示：
- `✓ 直接讀取 (100%)` - UI Automation
- `OCR 辨識 (85%)` - Tesseract
- `AI 辨識 (95%)` - AI Vision

---

## 實作步驟

### Phase 1: POC（1-2 小時）

1. [ ] 安裝 node-ffi-napi 和 ref-napi
2. [ ] 實作 `WindowFromPoint` 取得視窗 handle
3. [ ] 實作 `AccessibleObjectFromWindow` 取得 IAccessible
4. [ ] 測試讀取 Chrome 網頁標題

### Phase 2: 完整實作（2-3 小時）

5. [ ] 實作 UI Automation COM 介面
6. [ ] 遍歷選取區域內所有元素
7. [ ] 合併多元素文字
8. [ ] 處理 TextPattern / ValuePattern

### Phase 3: 整合（1 小時）

9. [ ] 整合到 textExtractor.ts
10. [ ] 加入 fallback 邏輯
11. [ ] UI 顯示辨識方法
12. [ ] 錯誤處理

---

## 預期效果

| 場景 | 之前 | 之後 |
|------|------|------|
| Instagram ID `linlinya_1214` | `[EAGT` (錯誤) | `linlinya_1214` (正確) |
| 特殊字體 | 亂碼 | 正確 |
| 瀏覽器網頁 | OCR 處理 | 直接讀取 |
| 速度 | ~500ms | ~10ms |

---

## 參考資源

- [Microsoft UI Automation](https://docs.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview)
- [node-ffi-napi](https://github.com/nicknisi/node-ffi-napi)
- [Windows Accessibility API](https://docs.microsoft.com/en-us/windows/win32/api/_accessibility/)
