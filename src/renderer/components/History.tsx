import { useState, useEffect } from 'react'
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

export function History({ onClose, onSelectItem, onCopy, onSearch, onInstagram }: HistoryProps) {
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
    if (confirm('確定要清除所有歷史紀錄？')) {
      await window.electronAPI.clearHistory()
      setHistory([])
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    }
    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('zh-TW', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    }
    // Older
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>📜 歷史紀錄</h2>
        <div className="history-actions">
          {history.length > 0 && (
            <button className="clear-btn" onClick={handleClearAll}>
              清除全部
            </button>
          )}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <div className="history-loading">載入中...</div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <span className="empty-icon">📭</span>
            <p>還沒有歷史紀錄</p>
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
                  <p className="item-text">{item.text || '(無文字)'}</p>
                  <span className="item-time">{formatTime(item.timestamp)}</span>
                </div>
                <div className="item-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); onCopy(item.text) }}
                    title="複製"
                  >
                    📋
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="刪除"
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
