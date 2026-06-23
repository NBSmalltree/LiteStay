import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Dialog } from '../../components'
import type { BackupInfo } from '../../../../shared/types'

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
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '加载备份列表失败: ' + e.message })
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
  const lastBackupTime = backups.length > 0 ? formatTime(backups[0].created_at) : '暂无'

  const handleCreate = async () => {
    setLoading(true)
    try {
      await window.electron.db.createBackup(customName.trim() || undefined)
      setCustomName('')
      setShowCreateDialog(false)
      setStatusMessage({ type: 'success', text: '备份创建成功' })
      await loadBackups()
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '备份失败: ' + e.message })
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
      setStatusMessage({ type: 'success', text: '备份恢复成功，应用将在2秒后重新加载' })
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '恢复失败: ' + e.message })
    } finally {
      setLoading(false)
      setSelectedBackup(null)
    }
  }

  const handleExport = async (backup: BackupInfo) => {
    try {
      const result = await window.electron.db.exportBackup(backup.filename)
      if (result) {
        setStatusMessage({ type: 'success', text: '备份已导出到: ' + result })
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '导出失败: ' + e.message })
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const result = await window.electron.db.importBackup()
      if (result) {
        setStatusMessage({ type: 'success', text: '备份导入成功: ' + result.filename })
        await loadBackups()
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '导入失败: ' + e.message })
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
      setStatusMessage({ type: 'success', text: '备份已删除' })
      await loadBackups()
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: '删除失败: ' + e.message })
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
          <div className="text-sm text-gray-500 mb-1">备份数量</div>
          <div className="text-2xl font-bold text-gray-900">{backups.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">最后备份时间</div>
          <div className="text-lg font-semibold text-gray-900">{lastBackupTime}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">备份总大小</div>
          <div className="text-2xl font-bold text-gray-900">{formatSize(totalSize)}</div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowCreateDialog(true)} disabled={loading}>
          {t('backup.createBackup')}
        </Button>
        <Button variant="secondary" onClick={handleImport} disabled={loading}>
          {t('backup.import')}
        </Button>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExport(backup)}
                    disabled={loading}
                  >
                    导出
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(backup)}
                    disabled={loading}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create backup dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="创建备份">
        <div className="space-y-4">
          <Input
            label="备份名称（可选）"
            id="backup-name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="留空则使用默认名称"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? '备份中...' : '确认备份'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm restore dialog */}
      <Dialog open={showConfirmRestore} onClose={() => setShowConfirmRestore(false)} title="确认恢复">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">{'⚠️'}</span>
              <span className="font-medium text-amber-800">警告</span>
            </div>
            <p className="text-sm text-amber-700 mt-2">
              恢复备份将覆盖当前所有数据，此操作不可撤销。建议先创建当前数据的备份。
            </p>
          </div>
          <div>
            <p className="text-gray-900">确定要恢复备份 <strong>{selectedBackup?.filename}</strong> 吗？</p>
            <p className="text-sm text-gray-500 mt-1">
              备份时间：{selectedBackup && formatTime(selectedBackup.created_at)}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowConfirmRestore(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmRestore} disabled={loading}>
              {loading ? '恢复中...' : '确认恢复'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} title="确认删除">
        <div className="space-y-4">
          <p className="text-gray-900">确定要删除备份 <strong>{selectedBackup?.filename}</strong> 吗？</p>
          <p className="text-sm text-gray-500">此操作不可撤销。</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              确认删除
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
