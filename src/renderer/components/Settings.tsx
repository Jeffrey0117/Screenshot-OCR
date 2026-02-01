import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import type { Language } from '../../shared/i18n'
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
  language: Language
}

export function Settings({ onClose }: SettingsProps) {
  const { t, lang, setLang } = useLanguage()
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
    if (key === 'theme') {
      document.documentElement.setAttribute('data-theme', value as string)
    }
  }

  const handleLanguageChange = (newLang: Language) => {
    handleChange('language', newLang)
    setLang(newLang)
  }

  const displayShortcut = (s: string) => s.replace(/CommandOrControl/g, 'Ctrl')
  const toElectronShortcut = (s: string) => s.replace(/\bCtrl\b/g, 'CommandOrControl')

  if (!settings) {
    return (
      <div className="settings">
        <div className="settings-loading">{t('settings.loading')}</div>
      </div>
    )
  }

  return (
    <div className="settings">
      {/* Header */}
      <div className="settings-header">
        <h2>{t('settings.title')}</h2>
        <div className="header-actions">
          <div className="theme-switcher">
            {(['light', 'dark'] as const).map(themeVal => (
              <button
                key={themeVal}
                className={`theme-btn ${settings.theme === themeVal ? 'active' : ''}`}
                onClick={() => handleChange('theme', themeVal)}
              >
                {themeVal === 'light' ? '☀' : '☾'}
              </button>
            ))}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Content */}
      <div className="settings-body">

        {/* Language selector */}
        <div className="setting-row language-row">
          <label>{t('settings.language')}</label>
          <div className="seg-btns">
            {([['en', 'EN'], ['zh-TW', '繁中']] as const).map(([val, label]) => (
              <button
                key={val}
                className={`seg-btn ${lang === val ? 'active' : ''}`}
                onClick={() => handleLanguageChange(val as Language)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcut */}
        <div className="setting-row shortcut-row">
          <label>{t('settings.shortcutLabel')}</label>
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
            <label>{t('settings.apiKey')}</label>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="api-link">{t('settings.getKey')}</a>
          </div>
          <div className="api-input-wrap">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.geminiApiKey}
              onChange={e => handleChange('geminiApiKey', e.target.value)}
              placeholder={t('settings.apiPlaceholder')}
            />
            <button
              className="toggle-vis"
              onClick={() => setShowApiKey(prev => !prev)}
              title={showApiKey ? t('settings.hide') : t('settings.show')}
            >
              {showApiKey ? '◉' : '○'}
            </button>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="settings-grid">
          {/* Left: toggles */}
          <div className="grid-col">
            <h4>{t('settings.general')}</h4>
            <label className="toggle-row">
              <span>{t('settings.autoStart')}</span>
              <input type="checkbox" className="toggle" checked={settings.autoStart} onChange={e => handleChange('autoStart', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>{t('settings.minimizeToTray')}</span>
              <input type="checkbox" className="toggle" checked={settings.minimizeToTray} onChange={e => handleChange('minimizeToTray', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>{t('settings.autoCopy')}</span>
              <input type="checkbox" className="toggle" checked={settings.autoCopy} onChange={e => handleChange('autoCopy', e.target.checked)} />
            </label>
            <div className="toggle-row">
              <span>{t('settings.autoClose')}</span>
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
            <h4>{t('settings.ocr')}</h4>
            <div className="seg-group">
              <label>{t('settings.accuracy')}</label>
              <div className="seg-btns">
                {([['fast', t('settings.fast')], ['balanced', t('settings.balanced')], ['accurate', t('settings.accurate')]] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    className={`seg-btn ${settings.ocrAccuracy === val ? 'active' : ''}`}
                    onClick={() => handleChange('ocrAccuracy', val as 'fast' | 'balanced' | 'accurate')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="toggle-row">
              <span>{t('settings.preprocess')}</span>
              <input type="checkbox" className="toggle" checked={settings.preprocessEnabled} onChange={e => handleChange('preprocessEnabled', e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>{t('settings.autoInvert')}</span>
              <input type="checkbox" className="toggle" checked={settings.preprocessAutoInvert} onChange={e => handleChange('preprocessAutoInvert', e.target.checked)} disabled={!settings.preprocessEnabled} />
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button className="btn secondary" onClick={onClose}>{t('settings.cancel')}</button>
        <button className="btn primary" onClick={saveSettings} disabled={saving}>
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
      </div>
    </div>
  )
}
