# OCR 技術研究報告

> 撰寫日期：2026-01-11
> 適用版本：screenshot-ocr 專案

---

## 目錄

1. [現有專案分析](#現有專案分析)
2. [圖片預處理技術](#圖片預處理技術)
3. [開源 OCR 引擎比較](#開源-ocr-引擎比較)
4. [改進建議](#改進建議)
5. [參考資料](#參考資料)

---

## 現有專案分析

### 目前架構

本專案 (`screenshot-ocr`) 採用多層次文字擷取策略，優先順序如下：

1. **UI Automation** (Windows only) - 直接讀取視窗元素文字，100% 準確
2. **Gemini AI Vision** - 需手動觸發，對藝術字體效果最佳
3. **PaddleOCR** - 透過 `@gutenye/ocr-node` (ONNX runtime)，中文效果優於 Tesseract
4. **Tesseract.js** - 作為 fallback 方案

### 現有預處理功能 (`imagePreprocess.ts`)

目前實作的預處理步驟：

| 功能 | 實作方式 | 備註 |
|------|----------|------|
| 放大 | Jimp resize (2x) | 避免過大導致幻覺 |
| 灰階轉換 | Jimp greyscale | 預設開啟 |
| 自動反轉 | 根據平均亮度 (<128 則反轉) | 處理深色背景 |
| 對比度增強 | Jimp contrast (1.5x) | 根據原始對比度調整 |
| 去噪 | 自製中值濾波 (8 鄰域平均) | 移除孤立噪點 |
| 銳化 | 3x3 卷積核 | 較溫和的銳化 |
| 二值化 | Otsu's method | 預設關閉 (threshold=0) |
| 彩色過濾 | 高飽和度像素過濾 | 移除游標等 UI 元素 |

### 現有問題

1. **二值化過於簡單**：僅實作全域 Otsu，對光照不均的圖片效果差
2. **去噪效果有限**：簡化版中值濾波，對複雜噪聲處理不足
3. **無傾斜校正**：截圖通常不需要，但未來可能需要
4. **缺乏 DPI 檢測**：未根據輸入解析度調整處理策略

---

## 圖片預處理技術

### 1. 二值化技術

二值化是將灰階圖像轉換為黑白圖像的關鍵步驟，直接影響 OCR 準確率。

#### 1.1 全域二值化

##### Otsu's Method
- **原理**：自動計算最佳閾值，最大化類間變異數
- **優點**：無需手動調參、計算快速、可 GPU 加速
- **缺點**：假設雙峰分布，對光照不均效果差
- **適用場景**：均勻光照的印刷文件
- **本專案狀態**：已實作 ✓

```python
# OpenCV 實作
ret, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

##### MROtsu (Multi-Region Otsu)
- **原理**：將圖像分區後各自計算 Otsu 閾值
- **優點**：比全域 Otsu 更適應局部變化
- **排名**：在多項研究中排名前列

#### 1.2 局部自適應二值化

##### Niblack Method
- **原理**：閾值 = 局部均值 - k × 局部標準差
- **參數**：k (通常 -0.2), 視窗大小
- **缺點**：對白色區域效果差，容易產生噪點

##### Sauvola Method
- **原理**：改進 Niblack，加入標準差正規化
- **公式**：`T(x,y) = m(x,y) × [1 + k × (s(x,y)/R - 1)]`
- **參數**：建議 k=0.2~0.5, 視窗 15×15, R=128
- **優點**：對光照變化更穩健，適合文件掃描
- **缺點**：計算較慢 (但有快速近似演算法)
- **本專案建議**：優先考慮實作 ✓

##### NICK Method
- **原理**：基於 Niblack 的改進版本
- **優點**：對白色/淺色頁面處理更佳
- **適用**：Logo 圖片、淺色背景文件

##### Wolf-Jolion Method
- **適用場景**：發票、Logo
- **特點**：與 Sauvola 類似，但參數調整不同

##### ISauvola (Improved Sauvola)
- **發表年份**：2016
- **改進**：優化的 Sauvola 演算法，更佳的文件二值化效果

#### 1.3 實作工具

**Doxa Framework**：
- 語言：C++ (有 JavaScript 和 Python 綁定)
- 支援：Otsu, Bernsen, Niblack, Sauvola, Wolf, Gatos, NICK, Su, ISauvola 等
- GitHub：[brandonmpetty/Doxa](https://github.com/brandonmpetty/Doxa)
- **本專案建議**：可考慮整合 JS 綁定版本

#### 1.4 二值化建議

| 圖片類型 | 建議方法 | 備註 |
|----------|----------|------|
| 螢幕截圖 | 不二值化 / Otsu | 通常品質已足夠 |
| Logo 圖片 | Sauvola / NICK / Wolf | 配合 DeSkew + AutoInvert |
| 發票文件 | Sauvola / Wolf | 預處理 DeSkew |
| 低品質掃描 | 自適應 (Sauvola) | 處理光照不均 |

### 2. 降噪方法

#### 2.1 傳統濾波

##### 高斯濾波 (Gaussian Blur)
- **原理**：使用高斯核進行卷積
- **優點**：速度快
- **缺點**：會模糊邊緣，影響 OCR 結果
- **建議**：謹慎使用，參數要小

##### 中值濾波 (Median Filter)
- **原理**：用鄰域中值取代中心像素
- **優點**：**保留邊緣**的同時去除椒鹽噪聲
- **本專案狀態**：已實作 (簡化版) ✓
- **改進建議**：使用 3×3 或 5×5 標準中值濾波

##### 雙邊濾波 (Bilateral Filter)
- **原理**：結合空間距離和像素強度差異
- **優點**：**最佳邊緣保留**，同時降噪
- **缺點**：計算較慢
- **本專案建議**：高優先實作 ✓

```python
# OpenCV 實作
denoised = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)
```

#### 2.2 深度學習方法

##### CNN 降噪
- **原理**：用卷積神經網路學習噪聲模式
- **優點**：對複雜噪聲效果佳
- **工具**：DocumentDenoise (GitHub)

##### 自編碼器 (Autoencoder)
- **原理**：編碼-解碼架構，學習去噪重建
- **應用**：OCR 預處理的最新研究方向

### 3. 傾斜校正 (Deskew)

#### 3.1 Hough Transform 方法
1. Canny 邊緣檢測
2. 檢測 75°-105° 範圍的直線
3. 統計最高頻率角度
4. 反向旋轉圖像

#### 3.2 投影分析法
- 計算各角度的水平投影
- 找最大方差對應的角度

#### 3.3 現代方法
- **Aspose.OCR**：提供自動傾斜校正 API
- **深度學習**：仿射/射影變換網路

#### 3.4 本專案考量
- 螢幕截圖通常無傾斜問題
- 建議：可作為可選功能，非預設

### 4. 對比度增強

#### 4.1 直方圖均衡化 (Histogram Equalization)
- **原理**：拉伸灰階分布
- **優點**：簡單有效
- **缺點**：可能過度增強

```python
enhanced = cv2.equalizeHist(gray)
```

#### 4.2 CLAHE (Contrast Limited Adaptive Histogram Equalization)
- **原理**：局部自適應直方圖均衡化
- **優點**：避免過度增強，**強烈建議**
- **參數**：clipLimit=2.0, tileGridSize=(8,8)

```python
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
enhanced = clahe.apply(gray)
```

#### 4.3 Gamma 校正
- **原理**：非線性亮度調整
- **應用**：調整過暗/過亮圖像

#### 4.4 局部亮度調整
- 處理光照不均的文件
- 可提升 20%+ 字元辨識準確率

### 5. 解析度處理

#### 5.1 DPI 建議
| DPI | 效果 |
|-----|------|
| < 200 | 準確率下降明顯 |
| 300 | **最佳推薦值** |
| > 600 | 可能產生不準確結果 |

#### 5.2 放大策略
- 使用雙三次插值 (Bicubic)
- 放大 2-3 倍對 OCR 有幫助
- 配合銳化可進一步提升

### 6. 現代 AI 增強預處理

#### 6.1 強化學習引導
- 研究顯示可將 Tesseract 4.0 準確率從 13.4% 提升到 61.6% (+359%)
- F1 分數從 0.163 提升到 0.729 (+347%)

#### 6.2 AI 預處理工具
- 預計可減少 40% 預處理時間
- 自動調整圖像品質、光照、傾斜

---

## 開源 OCR 引擎比較

### 總覽表

| 引擎 | 語言支援 | 中文準確率 | 英文準確率 | 速度 | Node.js 支援 | 授權 |
|------|----------|------------|------------|------|--------------|------|
| Tesseract 5.x | 116+ | ★★★ | ★★★★ | ★★★ | ✓ tesseract.js | Apache 2.0 |
| PaddleOCR | 100+ | ★★★★★ | ★★★★★ | ★★★★ | ✓ @gutenye/ocr | Apache 2.0 |
| EasyOCR | 80+ | ★★★★ | ★★★★ | ★★★ | △ node-easyocr | Apache 2.0 |
| Surya | 90+ | ★★★★ | ★★★★ | ★★★★ | ✗ (Python only) | CC BY-NC-SA |
| TrOCR | 1 (英文) | ✗ | ★★★★★ | ★★ | ✗ | MIT |
| docTR | 多語言 | ★★★★ | ★★★★★ | ★★★★ | ✗ (Python only) | Apache 2.0 |

### 1. Tesseract

#### 版本演進
| 版本 | 特點 |
|------|------|
| 3.x | 傳統 OCR，基於字符形狀匹配 |
| 4.x | 加入 LSTM 神經網路 |
| 5.x | 改進 LSTM，更好的 Unicode 支援 |

#### 優點
- **歷史悠久**：最成熟的開源 OCR
- **語言豐富**：116+ 語言
- **CPU 友善**：無需 GPU
- **Node.js 原生支援**：tesseract.js 成熟穩定
- **社群活躍**：問題容易找到解答

#### 缺點
- **複雜版面處理差**：表格、多欄排版
- **手寫辨識弱**：主要針對印刷體
- **內建二值化品質差**：自訂全域 Otsu，建議外部預處理
- **中文/阿拉伯文**：不如專門引擎

#### 準確率
- 高品質掃描：可達 95%+
- 複雜版面/低品質：顯著下降
- 中文：不如 PaddleOCR

#### 本專案使用狀態
- 作為最後 fallback 方案 ✓
- 透過 tesseract.js 整合 ✓

### 2. PaddleOCR

#### 版本演進
- **PP-OCRv1~v4**：持續改進的輕量級模型
- **PP-OCRv5** (2024)：13% 準確率提升
- **PaddleOCR-VL** (2025.10)：0.9B 參數的 VLM 模型，109 語言

#### 優點
- **中文最強**：百度專為中文優化
- **準確率高**：多項測試勝過 Tesseract
- **速度快**：輕量級模型設計
- **Node.js 支援佳**：
  - `@gutenye/ocr-node` (ONNX runtime) ✓ 本專案使用
  - `ppu-paddle-ocr`
  - `@paddlejs-models/ocr`
- **版面分析**：支援表格、結構化輸出

#### 缺點
- **依賴較大**：ONNX runtime
- **GPU 優化**：CPU 也可用但 GPU 更快

#### 準確率
- 中文：★★★★★ (業界領先)
- 英文：★★★★★
- 複雜版面：優於 Tesseract

#### 本專案使用狀態
- 作為主要 OCR 引擎 ✓
- 透過 @gutenye/ocr-node 整合 ✓

### 3. EasyOCR

#### 特點
- **易用性極佳**：3 行程式碼即可使用
- **80+ 語言**：含中文、阿拉伯文、泰文等
- **PyTorch 基底**：深度學習架構

#### 優點
- **快速整合**：API 設計友善
- **處理速度快**：優化過的推論
- **多語言支援**：非拉丁語系表現佳

#### 缺點
- **Node.js 支援弱**：`node-easyocr` 需要 Python 環境
- **準確率**：略遜於 PaddleOCR
- **無手寫支援**：目前版本

#### 本專案考量
- 不建議使用：Node.js 整合困難

### 4. Surya

#### 特點 (2024-2025)
- **現代架構**：專為文件版面分析設計
- **90+ 語言**：行級文字檢測與辨識
- **速度優異**：優於 Tesseract
- **5000+ GitHub Stars**

#### 功能
- OCR 辨識
- 版面分析 (表格、圖片、標題)
- 閱讀順序檢測
- 數學公式檢測

#### 效能
- 版面分析：88% 平均準確率，A10 GPU 0.4 秒/圖
- 文字檢測：A6000 GPU 0.79 秒/圖

#### 缺點
- **僅 Python**：無 Node.js 支援
- **商用限制**：CC BY-NC-SA 授權
  - 個人/研究使用免費
  - 年營收 > $5M 需商業授權

#### 本專案考量
- 目前不適用：無 Node.js 綁定
- 未來可考慮：若需要版面分析

### 5. TrOCR

#### 特點
- **微軟開發**
- **架構**：Vision Encoder (ViT) + Text Decoder (BERT/RoBERTa)
- **研究導向**：學術基準測試表現優異

#### 缺點
- **僅支援英文**
- **速度較慢**
- **無 Node.js 支援**

#### 本專案考量
- 不適用：無中文支援

### 6. docTR

#### 特點
- **Mindee 開發**
- **端到端 OCR**：檢測 + 辨識
- **雙框架**：支援 PyTorch 和 TensorFlow
- **現代架構**：DBNet 檢測 + CRNN/ViTSTR 辨識

#### 功能
- 旋轉/傾斜文件處理
- 版面分析
- 3 行程式碼整合

#### 效能
- 與 Google Vision / AWS Textract 相當

#### 缺點
- **僅 Python**
- **多語言支援有限**

### 7. 其他新興方案 (2024-2025)

#### OlmOCR-2
- **開源 VLM**：olmOCR-Bench 測試 75-83%
- **特點**：多模態 LLM 整合

#### DeepSeek-OCR
- **深度求索開發**
- **複雜文件**：表格、多欄處理佳

#### PaddleOCR-VL
- **2025.10 發布**
- **0.9B 參數**：輕量級 VLM
- **109 語言**：含困難語系 (阿拉伯、天城文、泰文)

### Node.js / Electron 整合比較

| 方案 | 套件 | 原生支援 | 依賴 | 本專案適用 |
|------|------|----------|------|------------|
| Tesseract | tesseract.js | ✓ 完全原生 | 無 | ✓ 已使用 |
| PaddleOCR | @gutenye/ocr-node | ✓ ONNX | onnxruntime | ✓ 已使用 |
| PaddleOCR | ppu-paddle-ocr | ✓ ONNX | 輕量 | △ 可考慮 |
| PaddleOCR | @paddlejs-models/ocr | ✓ WebGL | 瀏覽器環境 | △ Renderer 可用 |
| EasyOCR | node-easyocr | ✗ 需 Python | Python 3.6+ | ✗ 不建議 |
| Surya | - | ✗ 無 | - | ✗ 無法使用 |
| docTR | - | ✗ 無 | - | ✗ 無法使用 |

---

## 改進建議

### 高優先 (P0)

#### 1. 升級二值化演算法
**現狀**：僅有全域 Otsu，預設關閉
**建議**：增加 Sauvola 自適應二值化選項

```typescript
// 建議新增到 imagePreprocess.ts
export type BinarizationMethod = 'none' | 'otsu' | 'sauvola' | 'nick'

// Sauvola 實作
function sauvolaBinarize(image: Buffer, windowSize = 15, k = 0.2, R = 128): Buffer {
  // 計算積分圖像和平方積分圖像
  // 對每個像素計算局部閾值
  // T(x,y) = m(x,y) * [1 + k * (s(x,y)/R - 1)]
}
```

#### 2. 改進去噪
**現狀**：簡化版中值濾波
**建議**：使用雙邊濾波

```typescript
// 可考慮使用 sharp 套件的 sharpen/blur 功能
// 或整合 opencv4nodejs 的 bilateralFilter
```

#### 3. 新增 CLAHE 對比度增強
**現狀**：簡單線性對比度調整
**建議**：實作 CLAHE (對比度受限的自適應直方圖均衡化)

### 中優先 (P1)

#### 4. 自動 DPI 調整
**建議**：偵測輸入解析度，自動調整放大倍率

```typescript
function calculateOptimalScale(width: number, height: number): number {
  const avgDimension = (width + height) / 2
  if (avgDimension < 100) return 4      // 非常小的圖片
  if (avgDimension < 200) return 3
  if (avgDimension < 400) return 2
  if (avgDimension < 800) return 1.5
  return 1  // 大圖片不需放大
}
```

#### 5. 預處理管線配置化
**建議**：允許使用者自訂預處理步驟順序和參數

```typescript
interface PreprocessPipeline {
  steps: Array<{
    type: 'scale' | 'grayscale' | 'denoise' | 'binarize' | 'sharpen' | 'contrast'
    enabled: boolean
    params: Record<string, number | string | boolean>
  }>
}
```

### 低優先 (P2)

#### 6. 考慮整合 Doxa 框架
- JavaScript 綁定可用
- 提供多種專業二值化演算法

#### 7. 版面分析功能
- 未來若需處理複雜文件
- 可考慮整合 PaddleOCR 的版面分析模組

#### 8. 效能最佳化
- 預處理可考慮 Web Worker
- 大圖片分塊處理

### 不建議變更

1. **保持 PaddleOCR 為主要引擎**：中文表現最佳
2. **保持 Tesseract 作為 fallback**：穩定可靠
3. **保持 Gemini AI 手動觸發**：成本和隱私考量

---

## 參考資料

### 預處理技術
- [OpenCV: Image Thresholding](https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html)
- [Doxa Binarization Framework](https://github.com/brandonmpetty/Doxa)
- [Improve OCR Accuracy Using Advanced Preprocessing](https://www.nitorinfotech.com/blog/improve-ocr-accuracy-using-advanced-preprocessing-techniques/)
- [7 Steps of Image Pre-processing to Improve OCR](https://nextgeninvent.com/blogs/7-steps-of-image-pre-processing-to-improve-ocr-using-python-2/)
- [Survey on Image Preprocessing Techniques](https://medium.com/technovators/survey-on-image-preprocessing-techniques-to-improve-ocr-accuracy-616ddb931b76)
- [Improving Tesseract 4.0 with Convolution-Based Preprocessing](https://www.mdpi.com/2073-8998/12/5/715)

### OCR 引擎
- [Best Open-Source OCR Tools in 2025](https://unstract.com/blog/best-opensource-ocr-tools-in-2025/)
- [8 Top Open-Source OCR Models Compared](https://modal.com/blog/8-top-open-source-ocr-models-compared)
- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [Surya OCR GitHub](https://github.com/datalab-to/surya)
- [docTR Documentation](https://mindee.github.io/doctr/)
- [Tesseract OCR Documentation](https://tesseract-ocr.github.io/tessdoc/)
- [7 Best Open-Source OCR Models 2025](https://www.e2enetworks.com/blog/complete-guide-open-source-ocr-models-2025)

### Node.js 整合
- [gutenye/ocr (PaddleOCR Node.js)](https://github.com/gutenye/ocr)
- [ppu-paddle-ocr](https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr)
- [@paddlejs-models/ocr](https://www.npmjs.com/package/@paddlejs-models/ocr)

---

## 結論

本專案目前的 OCR 架構設計合理，使用 PaddleOCR 作為主要引擎的選擇正確。主要改進空間在於**圖片預處理**：

1. **短期**：升級二值化 (Sauvola) 和去噪 (雙邊濾波)
2. **中期**：新增 CLAHE 對比度增強、自動 DPI 調整
3. **長期**：考慮整合更多專業預處理演算法

對於 OCR 引擎本身，建議保持現有架構：
- PaddleOCR：主力，中文最強
- Tesseract：穩定 fallback
- Gemini AI：複雜/藝術字體的最後手段

這樣的組合已經涵蓋了大多數使用場景，且都有良好的 Node.js/Electron 支援。
