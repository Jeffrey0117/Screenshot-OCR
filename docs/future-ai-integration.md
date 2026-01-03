# Future: AI Integration

## 概念

整合 GPT-4 Vision 或 Claude Vision API，提供更強大的 OCR 和智能功能。

## 功能規劃

### 1. AI OCR（優先）
- 使用 GPT-4 Vision / Claude Vision 辨識圖片文字
- 優點：比 Tesseract 更準確，能辨識手寫、特殊字體、底線等
- 缺點：需要 API Key、有費用、需要網路

### 2. 智能問答
辨識後可以對文字進行：
- 翻譯（英翻中、中翻英）
- 解釋（這段程式碼是什麼意思？）
- 摘要（這篇文章在講什麼？）
- 格式化（把這段 JSON 格式化）

### 3. UI 設計

```
┌─────────────────────────────────┐
│ Screenshot OCR          📌 ⚙️ ✕ │
├─────────────────────────────────┤
│ [截圖預覽]                      │
├─────────────────────────────────┤
│ 辨識結果：                      │
│ _jane_three                     │
├─────────────────────────────────┤
│ 🤖 問 AI...                     │
│ ┌─────────────────────────────┐ │
│ │ 翻譯成中文                  │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [📋複製] [✂️裁切] [🔍] [📷]     │
└─────────────────────────────────┘
```

## 技術實作

### API 選項
1. **OpenAI GPT-4 Vision** - 最成熟
2. **Claude Vision** - Anthropic 的選項
3. **Google Gemini** - 免費額度較多

### 設定頁面
- API Provider 選擇（OpenAI / Claude / Gemini）
- API Key 輸入
- 預設 Prompt 設定

### 程式碼結構
```
src/main/
  ai/
    openai.ts      # OpenAI API 封裝
    claude.ts      # Claude API 封裝
    gemini.ts      # Gemini API 封裝
    index.ts       # 統一介面
```

## 費用估算

| API | 價格 | 每次截圖成本 |
|-----|------|-------------|
| GPT-4 Vision | $0.01/1K tokens | ~$0.005 |
| Claude Vision | $0.008/1K tokens | ~$0.004 |
| Gemini | 免費額度 | $0 (有限制) |

## 開發順序

1. [ ] 設定頁面加入 API Key 輸入
2. [ ] 實作 OpenAI Vision API
3. [ ] 加入「AI 辨識」按鈕
4. [ ] 加入「問 AI」輸入框
5. [ ] 支援更多 API Provider
