import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import '../styles/History.css'

interface HistoryItem {
  id: string
  image: string
  text: string
  timestamp: number
}

interface HistoryProps {
  onClose: () => void
  onSelectItem: (item: HistoryItem) => void
  onCopy: (text: string) => void
  onSearch: (text: string) => void
  onInstagram: (text: string) => void
}

export function History({ onClose, onSelectItem, onCopy }: HistoryProps) {
  const { t, lang } = useLanguage()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    const items = await window.electronAPI.getHistory()
    setHistory(items)
    setLoading(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = await window.electronAPI.deleteHistoryItem(id)
    setHistory(updated)
  }

  const handleClearAll = async () => {
    if (confirm(t('history.confirmClear'))) {
      await window.electronAPI.clearHistory()
      setHistory([])
    }
  }

  const locale = lang === 'en' ? 'en-US' : 'zh-TW'

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }
    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    }
    // Older
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>📜 {t('history.title')}</h2>
        <div className="history-actions">
          {history.length > 0 && (
            <button className="clear-btn" onClick={handleClearAll}>
              {t('history.clearAll')}
            </button>
          )}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <div className="history-loading">{t('history.loading')}</div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <span className="empty-icon">📭</span>
            <p>{t('history.empty')}</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => onSelectItem(item)}
              >
                <div className="item-content">
                  <p className="item-text">{item.text || t('history.noText')}</p>
                  <span className="item-time">{formatTime(item.timestamp)}</span>
                </div>
                <div className="item-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); onCopy(item.text) }}
                    title={t('history.copy')}
                  >
                    📋
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => handleDelete(item.id, e)}
                    title={t('history.delete')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
