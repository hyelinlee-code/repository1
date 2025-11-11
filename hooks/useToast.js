'use client'

import { useState, useCallback } from 'react'

/**
 * 토스트 알림 관리 훅
 */
export default function useToast() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((type, message, duration = 3000) => {
    const id = Date.now()
    const toast = { id, type, message, duration }
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message, duration) => {
    return showToast('success', message, duration)
  }, [showToast])

  const error = useCallback((message, duration) => {
    return showToast('error', message, duration)
  }, [showToast])

  const info = useCallback((message, duration) => {
    return showToast('info', message, duration)
  }, [showToast])

  const warning = useCallback((message, duration) => {
    return showToast('warning', message, duration)
  }, [showToast])

  return {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    info,
    warning,
  }
}

