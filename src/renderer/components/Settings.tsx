import { useState, useEffect } from 'react'
import '../styles/Settings.css'

interface SettingsProps {
  onClose: () => void
}

interface AppSettings {
  autoStart: boolean
  minimizeToTray: boolean
  autoCopy: boolean
  autoCloseDelay: number
  shortcuts: {
    capture: string
    copy: string
    search: string
  }
  ocrLanguages: string[]
  ocrAccuracy: 'fast' | 'balanced' | 'accurate'
  preprocessEnabled: boolean
  preprocessAutoInvert: boolean
  theme: 'light' | 'dark' | 'system'
}

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'chi_tra', name: '繁體中文' },
  { code: 'chi_sim', name: '简体中文' },
  { code: 'jpn', name: '日本語' },
  { code: 'kor', name: '한국어' }
]

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const loaded = await window.electronAPI.getSettings()
    setSettings(loaded as unknown as AppSettings)
  }

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    await window.electronAPI.updateSettings(settings as unknown as Record<string, unknown>)
    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', settings.theme)
    setSaving(false)
  }

  const handleChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const handleLanguageToggle = (langCode: string) => {
    if (!settings) return
    const current = settings.ocrLanguages
    const updated = current.includes(langCode)
      ? current.filter(l => l !== langCode)
      : [...current, langCode]

    // Ensure at least one language is selected
    if (updated.length === 0) return

    handleChange('ocrLanguages', updated)
  }

  if (!settings) {
    return (
      <div className="settings">
        <div className="settings-loading">載入中...</div>
      </div>
    )
  }

  return (
    <div className="settings">
      {/* Header */}
      <div className="settings-header">
        <h2>設定</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* General */}
        <section className="settings-section">
          <h3>一般</h3>

          <label className="setting-item checkbox">
            <input
              type="checkbox"
              checked={settings.autoStart}
              onChange={e => handleChange('autoStart', e.target.checked)}
            />
            <span>開機自動啟動</span>
          </label>

          <label className="setting-item checkbox">
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              onChange={e => handleChange('minimizeToTray', e.target.checked)}
            />
            <span>最小化到系統托盤</span>
          </label>

          <label className="setting-item checkbox">
            <input
              type="checkbox"
              checked={settings.autoCopy}
              onChange={e => handleChange('autoCopy', e.target.checked)}
            />
            <span>辨識完成後自動複製</span>
          </label>

          <div className="setting-item">
            <label>自動關閉延遲</label>
            <div className="input-group">
              <input
                type="number"
                min="0"
                max="60"
                value={settings.autoCloseDelay}
                onChange={e => handleChange('autoCloseDelay', parseInt(e.target.value) || 0)}
              />
              <span>秒 (0 = 不自動關閉)</span>
            </div>
          </div>
        </section>

        {/* Shortcuts */}
        <section className="settings-section">
          <h3>快捷鍵</h3>

          <div className="setting-item">
            <label>截圖辨識</label>
            <input
              type="text"
              value={settings.shortcuts.capture}
              onChange={e => handleChange('shortcuts', {
                ...settings.shortcuts,
                capture: e.target.value
              })}
              placeholder="Ctrl+Shift+S"
            />
          </div>
        </section>

        {/* OCR */}
        <section className="settings-section">
          <h3>OCR 設定</h3>

          <div className="setting-item">
            <label>辨識語言</label>
            <div className="language-grid">
              {LANGUAGES.map(lang => (
                <label key={lang.code} className="language-option">
                  <input
                    type="checkbox"
                    checked={settings.ocrLanguages.includes(lang.code)}
                    onChange={() => handleLanguageToggle(lang.code)}
                  />
                  <span>{lang.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="setting-item">
            <label>辨識精度</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="accuracy"
                  checked={settings.ocrAccuracy === 'fast'}
                  onChange={() => handleChange('ocrAccuracy', 'fast')}
                />
                <span>快速</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="accuracy"
                  checked={settings.ocrAccuracy === 'balanced'}
                  onChange={() => handleChange('ocrAccuracy', 'balanced')}
                />
                <span>平衡</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="accuracy"
                  checked={settings.ocrAccuracy === 'accurate'}
                  onChange={() => handleChange('ocrAccuracy', 'accurate')}
                />
                <span>精確</span>
              </label>
            </div>
          </div>

          <div className="setting-item">
            <label>圖片預處理</label>
            <div className="checkbox-group">
              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={settings.preprocessEnabled}
                  onChange={e => handleChange('preprocessEnabled', e.target.checked)}
                />
                <span>啟用預處理（提升辨識率）</span>
              </label>
              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={settings.preprocessAutoInvert}
                  onChange={e => handleChange('preprocessAutoInvert', e.target.checked)}
                  disabled={!settings.preprocessEnabled}
                />
                <span>自動反轉深色背景</span>
              </label>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-section">
          <h3>外觀</h3>

          <div className="setting-item">
            <label>主題</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === 'light'}
                  onChange={() => handleChange('theme', 'light')}
                />
                <span>淺色</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === 'dark'}
                  onChange={() => handleChange('theme', 'dark')}
                />
                <span>深色</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === 'system'}
                  onChange={() => handleChange('theme', 'system')}
                />
                <span>跟隨系統</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button className="btn secondary" onClick={onClose}>
          取消
        </button>
        <button
          className="btn primary"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </div>
  )
}
