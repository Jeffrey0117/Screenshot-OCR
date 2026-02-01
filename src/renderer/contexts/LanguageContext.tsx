import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { t as translate, type Language, type TranslationKey } from '../../shared/i18n'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'zh-TW',
  setLang: () => {},
  t: (key) => translate(key, 'zh-TW'),
})

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Language>('zh-TW')

  useEffect(() => {
    const loadLanguage = async () => {
      const settings = await window.electronAPI.getSettings() as { language?: Language }
      if (settings.language) {
        setLangState(settings.language)
      }
    }
    loadLanguage()
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    window.electronAPI.updateSettings({ language: newLang } as Record<string, unknown>)
    window.electronAPI.languageChanged(newLang)
  }, [])

  const tFn = useCallback((key: TranslationKey) => translate(key, lang), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
