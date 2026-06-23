import { useState, useCallback } from 'react'
import { AlertDialog } from './AlertDialog'
import { ConfirmDialog } from './ConfirmDialog'

interface AlertOptions {
  title?: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
}

export function useDialogs() {
  const [alertState, setAlertState] = useState<AlertOptions & { open: boolean }>({
    open: false,
    message: '',
  })

  const [confirmState, setConfirmState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({ ...options, open: true })
  }, [])

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState({ ...options, open: true })
  }, [])

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, open: false }))
  }, [])

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false }))
  }, [])

  const AlertComponent = (
    <AlertDialog
      open={alertState.open}
      onClose={closeAlert}
      title={alertState.title}
      message={alertState.message}
      variant={alertState.variant}
    />
  )

  const ConfirmComponent = (
    <ConfirmDialog
      open={confirmState.open}
      onClose={closeConfirm}
      onConfirm={confirmState.onConfirm}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      variant={confirmState.variant}
    />
  )

  return {
    showAlert,
    showConfirm,
    AlertComponent,
    ConfirmComponent,
  }
}
