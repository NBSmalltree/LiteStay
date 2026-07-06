import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, useDialogs } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import UpgradeBadge from '../../components/UpgradeBadge'
import InvoiceEditDialog from './InvoiceEditDialog'
import InvoiceDetailDialog from './InvoiceDetailDialog'
import InvoiceTable from './InvoiceTable'
import type { InvoiceWithOrder, Order } from '../../../shared/types'

interface Props {
  refreshKey: number
}

export default function InvoicesPage({ refreshKey }: Props) {
  const { t, i18n } = useTranslation()
  const { hasFeature } = useEdition()
  const currencyLocale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  const { showAlert, AlertComponent } = useDialogs()
  const [invoices, setInvoices] = useState<InvoiceWithOrder[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showEdit, setShowEdit] = useState(false)
  const [editInvoice, setEditInvoice] = useState<InvoiceWithOrder | null>(null)
  const [showDetail, setShowDetail] = useState<InvoiceWithOrder | null>(null)

  const loadInvoices = useCallback(async () => {
    try {
      const data: InvoiceWithOrder[] = await window.electron.db.getInvoices()
      setInvoices(data)
    } catch {
      setInvoices([])
    }
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      const data: Order[] = await window.electron.db.getOrders()
      setOrders(data)
    } catch {
      setOrders([])
    }
  }, [])

  useEffect(() => {
    loadInvoices()
    loadOrders()
  }, [loadInvoices, loadOrders, refreshKey])

  // Statistics
  const pendingCount = useMemo(() => invoices.filter(i => i.status === 'pending').length, [invoices])

  const issuedThisMonth = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return invoices.filter(i => i.status === 'issued' && i.issued_at && i.issued_at.startsWith(monthStr)).length
  }, [invoices])

  const totalAmount = useMemo(() => invoices.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + i.actual_amount, 0), [invoices])

  // Filtered list
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices
    return invoices.filter(i => i.status === statusFilter)
  }, [invoices, statusFilter])

  const handleNew = () => {
    setEditInvoice(null)
    setShowEdit(true)
  }

  const handleEdit = (inv: InvoiceWithOrder) => {
    setEditInvoice(inv)
    setShowEdit(true)
  }

  const handleMarkIssued = async (invoiceId: number) => {
    try {
      await window.electron.db.markInvoiceIssued(invoiceId)
      loadInvoices()
    } catch (e: any) {
      showAlert({ message: e?.message || t('invoices.operationFailed'), variant: 'error' })
    }
  }

  const handleCancel = async (invoiceId: number) => {
    try {
      await window.electron.db.updateInvoice(invoiceId, { status: 'cancelled' })
      loadInvoices()
    } catch (e: any) {
      showAlert({ message: e?.message || t('invoices.operationFailed'), variant: 'error' })
    }
  }

  const handleDelete = async (invoiceId: number) => {
    if (confirmDeleteId !== invoiceId) {
      setConfirmDeleteId(invoiceId)
      return
    }
    try {
      await window.electron.db.deleteInvoice(invoiceId)
      setConfirmDeleteId(null)
      loadInvoices()
    } catch (e: any) {
      showAlert({ message: e?.message || t('invoices.deleteFailed'), variant: 'error' })
    }
  }

  const handleExport = async () => {
    try {
      const result = await window.electron.db.exportInvoiceList(statusFilter)
      if (result) {
        showAlert({ message: `${t('invoices.exportSuccess')}: ${result}`, variant: 'success' })
      }
    } catch (e: any) {
      showAlert({ message: e?.message || t('invoices.exportFailed'), variant: 'error' })
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoices.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('invoices.subtitle')}</p>
        </div>
        <Button onClick={handleNew}>{t('invoices.addInvoice')}</Button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.pending')}</div>
            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.issuedThisMonth')}</div>
            <div className="text-3xl font-bold text-green-600">{issuedThisMonth}</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">{t('invoices.totalAmount')}</div>
            <div className="text-3xl font-bold text-blue-600">{totalAmount.toLocaleString(currencyLocale, { style: 'currency', currency: 'CNY' })}</div>
          </div>
        </Card>
      </div>

      {/* Filter and export */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {[
              { value: 'all', label: t('invoices.status.all') },
              { value: 'pending', label: t('invoices.status.pending') },
              { value: 'issued', label: t('invoices.status.issued') },
              { value: 'cancelled', label: t('invoices.status.cancelled') },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {hasFeature('invoice.export') ? (
            <Button variant="secondary" onClick={handleExport}>
              <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('invoices.exportExcel')}
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('invoices.exportExcel')} <UpgradeBadge requiredEdition="ultimate" />
            </Button>
          )}
        </div>

        {/* Invoice list table */}
        {filteredInvoices.length > 0 ? (
          <InvoiceTable
            invoices={filteredInvoices}
            confirmDeleteId={confirmDeleteId}
            currencyLocale={currencyLocale}
            onView={(inv) => setShowDetail(inv)}
            onEdit={handleEdit}
            onMarkIssued={handleMarkIssued}
            onCancel={handleCancel}
            onDelete={handleDelete}
          />
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {invoices.length === 0 ? t('invoices.noInvoices') : t('invoices.noFilteredInvoices')}
          </div>
        )}
      </Card>

      {/* Edit / New Invoice Dialog */}
      <InvoiceEditDialog
        open={showEdit}
        invoice={editInvoice}
        orders={orders}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); setEditInvoice(null); loadInvoices() }}
      />

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={!!showDetail}
        invoice={showDetail}
        currencyLocale={currencyLocale}
        onClose={() => setShowDetail(null)}
      />

      {AlertComponent}
    </div>
  )
}
