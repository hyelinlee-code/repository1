'use client'

import { useEffect } from 'react'

/**
 * 토스트 알림 컴포넌트
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @param {string} message - 표시할 메시지
 * @param {function} onClose - 닫기 콜백
 * @param {number} duration - 자동 닫힘 시간 (ms), 0이면 자동 닫힘 안함
 */
export default function Toast({ type = 'info', message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${styles[type]} min-w-[300px] max-w-[500px]`}>
        <span className="text-xl font-bold">{icons[type]}</span>
        <p className="flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-xl hover:opacity-70 transition-opacity"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
    </div>
  )
}

