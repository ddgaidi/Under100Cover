'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  emoji: string
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], emoji?: string) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', emoji = '✨') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, emoji }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const colors = {
    success: 'bg-accent-green',
    error: 'bg-accent-red',
    info: 'bg-primary-400',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast flex items-center gap-3"
            style={{
              background: toast.type === 'success' ? '#6BCB77' : toast.type === 'error' ? '#FF4757' : '#FFD700',
              color: '#2D1F3D',
            }}
          >
            <span className="text-2xl">{toast.emoji}</span>
            <span className="font-bold font-body">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
