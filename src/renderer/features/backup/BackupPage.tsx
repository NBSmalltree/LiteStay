import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Dialog } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import UpgradeBadge from '../../components/UpgradeBadge'
import type { BackupInfo } from '../../../shared/types'

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function BackupPage({ refreshKey }: { refreshKey?: number }) {
  const { t } = useTranslation()
  const { hasFeature } = useEdition()
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [customName, setCustomName] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadBackups = useCallback(async () => {
    try {
      const list = await window.electron.db.getBackups()
      setBackups(list)
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.loadingFailed') + ': ' + (e as Error).message })
    }
  }, [])

  useEffect(() => { loadBackups() }, [loadBackups, refreshKey])

  // Auto-hide status messages
  useEffect(() => {
    if (!statusMessage) return
    const t = setTimeout(() => setStatusMessage(null), 4000)
    return () => clearTimeout(t)
  }, [statusMessage])

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0)
  const lastBackupTime = backups.length > 0 ? formatTime(backups[0].created_at) : t('backup.noBackup')

  const handleCreate = async () => {
    setLoading(true)
    try {
      await window.electron.db.createBackup(customName.trim() || undefined)
      setCustomName('')
      setShowCreateDialog(false)
      setStatusMessage({ type: 'success', text: t('backup.backupCreated') })
      await loadBackups()
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.backupFailed') + ': ' + (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = (backup: BackupInfo) => {
    setSelectedBackup(backup)
    setShowConfirmRestore(true)
  }

  const confirmRestore = async () => {
    if (!selectedBackup) return
    setLoading(true)
    setShowConfirmRestore(false)
    try {
      await window.electron.db.restoreBackup(selectedBackup.filename)
      setStatusMessage({ type: 'success', text: t('backup.restoreSuccess') })
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.restoreFailed') + ': ' + (e as Error).message })
    } finally {
      setLoading(false)
      setSelectedBackup(null)
    }
  }

  const handleExport = async (backup: BackupInfo) => {
    try {
      const result = await window.electron.db.exportBackup(backup.filename)
      if (result) {
        setStatusMessage({ type: 'success', text: t('backup.exportedTo') + ': ' + result })
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.exportFailed') + ': ' + (e as Error).message })
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const result = await window.electron.db.importBackup()
      if (result) {
        setStatusMessage({ type: 'success', text: t('backup.importSuccess') + ': ' + result.filename })
        await loadBackups()
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.importFailed') + ': ' + (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (backup: BackupInfo) => {
    setSelectedBackup(backup)
    setShowConfirmDelete(true)
  }

  const confirmDelete = async () => {
    if (!selectedBackup) return
    try {
      await window.electron.db.deleteBackup(selectedBackup.filename)
      setStatusMessage({ type: 'success', text: t('backup.deleted') })
      await loadBackups()
    } catch (e) {
      setStatusMessage({ type: 'error', text: t('backup.deleteFailed') + ': ' + (e as Error).message })
    } finally {
      setShowConfirmDelete(false)
      setSelectedBackup(null)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('backup.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('backup.subtitle')}</p>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          statusMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span>{statusMessage.type === 'success' ? '✅' : '❌'}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-500 mb-1">{t('backup.totalBackups')}</div>
          <div className="text-2xl font-bold text-gray-900">{backups.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">{t('backup.lastBackup')}</div>
          <div className="text-lg font-semibold text-gray-900">{lastBackupTime}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">{t('backup.totalSize')}</div>
          <div className="text-2xl font-bold text-gray-900">{formatSize(totalSize)}</div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowCreateDialog(true)} disabled={loading}>
          {t('backup.createBackup')}
        </Button>
        {hasFeature('backup.importExport') ? (
          <Button variant="secondary" onClick={handleImport} disabled={loading}>
            {t('backup.import')}
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            {t('backup.import')} <UpgradeBadge requiredEdition="pro" />
          </Button>
        )}
      </div>

      {/* Backup list */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('backup.title')}</h2>
        {backups.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">{t('backup.noBackups')}</div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.filename} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div>
                  <h3 className="font-medium text-gray-900">{backup.filename}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatTime(backup.created_at)} &middot; {formatSize(backup.size)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRestore(backup)}
                    disabled={loading}
                  >
                    {t('backup.restore')}
                  </Button>
                  {hasFeature('backup.importExport') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport(backup)}
                      disabled={loading}
                    >
                      {t('backup.export')}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(backup)}
                    disabled={loading}
                  >
                    {t('backup.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create backup dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} title={t('backup.createBackup')}>
        <div className="space-y-4">
          <Input
            label={t('backup.backupName')}
            id="backup-name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t('backup.backupNamePlaceholder')}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? t('backup.backingUp') : t('backup.confirmBackup')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm restore dialog */}
      <Dialog open={showConfirmRestore} onClose={() => setShowConfirmRestore(false)} title={t('backup.confirmRestore')}>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">{'⚠️'}</span>
              <span className="font-medium text-amber-800">{t('backup.warning')}</span>
            </div>
            <p className="text-sm text-amber-700 mt-2">
              {t('backup.restoreWarning')} {t('backup.restoreSuggestion')}
            </p>
          </div>
          <div>
            <p className="text-gray-900">{t('backup.confirmRestoreText')} <strong>{selectedBackup?.filename}</strong> ?</p>
            <p className="text-sm text-gray-500 mt-1">
              {t('backup.createdAt')}：{selectedBackup && formatTime(selectedBackup.created_at)}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowConfirmRestore(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRestore} disabled={loading}>
              {loading ? t('backup.restoring') : t('backup.confirmRestore')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} title={t('backup.confirmDelete')}>
        <div className="space-y-4">
          <p className="text-gray-900">{t('backup.confirmDeleteText')} <strong>{selectedBackup?.filename}</strong> ?</p>
          <p className="text-sm text-gray-500">{t('backup.irreversible')}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('backup.confirmDelete')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
