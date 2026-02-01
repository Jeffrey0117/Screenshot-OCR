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
  geminiApiKey: string
  theme: 'light' | 'dark' | 'system'
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

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
    document.documentElement.setAttribute('data-theme', settings.theme)
    setSaving(false)
  }

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  const displayShortcut = (s: string) => s.replace(/CommandOrControl/g, 'Ctrl')
  const toElectronShortcut = (s: string) => s.replace(/\bCtrl\b/g, 'CommandOrControl')

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
        <div className="header-actions">
          <div className="theme-switcher">
            {(['light', 'dark', 'system'] as const).map(t => (
              <button
                key={t}
                className={`theme-btn ${settings.theme === t ? 'active' : ''}`}
                onClick={() => handleChange('theme', t)}
              >
                {t === 'light' ? '☀' : t === 'dark' ? '☾' : '⚙'}
              </button>
            ))}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Content — no scroll needed */}
      <div className="settings-body">

        {/* Shortcut — most important, top */}
        <div className="setting-row shortcut-row">
          <label>截圖辨識</label>
          <input
            type="text"
            value={displayShortcut(settings.shortcuts.capture)}
            onChange={e => handleChange('shortcuts', {
              ...settings.shortcuts,
              capture: toElectronShortcut(e.target.value)
            })}
            placeholder="Ctrl+Shift+S"
          />
        </div>

        {/* Gemini API Key */}
        <div className="setting-row api-row">
          <div className="api-label">
            <label>Gemini API Key</label>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="api-link">取得金鑰</a>
          </div>
          <div className="api-input-wrap">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.geminiApiKey}
              onChange={e => handleChange('geminiApiKey', e.target.value)}
              placeholder="貼上 API Key（選填）"
            />
            <button
              className="toggle-vis"
              onClick={() => setShowApiKey(prev => !prev)}
              title={showApiKey ? '隱藏' : '顯示'}
            >
              {showApiKey ? '◉' : '○'}
            </button>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="settings-grid">
          {/* Left: toggles */}
          <div className="grid-col">
            <h4>一般</h4>
            <label className="toggle-row">
              <span>開機自動啟動</span>
              <input type="checkbox" className="toggle" checked={settings.autoStart} onChange={e => handleChange('autoStart', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>最小化到托盤</span>
              <input type="checkbox" className="toggle" checked={settings.minimizeToTray} onChange={e => handleChange('minimizeToTray', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>辨識後自動複製</span>
              <input type="checkbox" className="toggle" checked={settings.autoCopy} onChange={e => handleChange('autoCopy', e.target.checked)} />
            </label>
            <div className="toggle-row">
              <span>自動關閉 (秒)</span>
              <input
                type="number" min="0" max="60"
                value={settings.autoCloseDelay}
                onChange={e => handleChange('autoCloseDelay', parseInt(e.target.value) || 0)}
                className="num-input"
              />
            </div>
          </div>

          {/* Right: OCR */}
          <div className="grid-col">
            <h4>OCR</h4>
            <div className="seg-group">
              <label>辨識精度</label>
              <div className="seg-btns">
                {([['fast', '快速'], ['balanced', '平衡'], ['accurate', '精確']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    className={`seg-btn ${settings.ocrAccuracy === val ? 'active' : ''}`}
                    onClick={() => handleChange('ocrAccuracy', val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="toggle-row">
              <span>圖片預處理</span>
              <input type="checkbox" className="toggle" checked={settings.preprocessEnabled} onChange={e => handleChange('preprocessEnabled', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>自動反轉深色背景</span>
              <input type="checkbox" className="toggle" checked={settings.preprocessAutoInvert} onChange={e => handleChange('preprocessAutoInvert', e.target.checked)} disabled={!settings.preprocessEnabled} />
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button className="btn secondary" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={saveSettings} disabled={saving}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  )
}
