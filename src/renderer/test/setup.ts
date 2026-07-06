import '@testing-library/jest-dom'

// Mock i18next — returns translation key as fallback
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => ({
      'checkIn.title': '办理入住', 'checkIn.wechat': '微信', 'checkIn.alipay': '支付宝',
      'checkIn.cash': '现金', 'checkIn.guestName': '客人姓名', 'checkIn.guestPhone': '客人电话',
      'checkIn.checkInDate': '入住日期', 'checkIn.checkOutDate': '离店日期', 'checkIn.nights': '入住天数',
      'checkIn.basePrice': '基础房价', 'checkIn.nightsUnit': '晚', 'checkIn.actualAmount': '实收金额',
      'checkIn.deposit': '押金', 'checkIn.paymentMethod': '支付方式', 'checkIn.source': '客源',
      'checkIn.notes': '备注', 'checkIn.notesPlaceholder': '可选备注信息', 'checkIn.basePricePerNight': '基础房价',
      'checkIn.guestNameRequired': '请输入客人姓名', 'checkIn.checkOutMustAfterCheckIn': '离店日期必须晚于入住日期',
      'checkIn.saveFailed': '保存失败', 'checkIn.saving': '保存中...', 'checkIn.confirm': '确认入住',
      'common.cancel': '取消', 'common.save': '保存', 'sources.direct': '直接预订', 'sources.ctrip': '携程',
      'sources.meituan': '美团', 'sources.returning': '回头客', 'sources.other': '其他',
    }[key] || key),
    i18n: { language: 'zh', changeLanguage: vi.fn() },
  })),
}))

// Mock global window.electron — Proxy auto-creates vi.fn() for any unlisted method
const mockDb = new Proxy({}, { get: () => vi.fn() })

Object.defineProperty(window, 'electron', {
  value: {
    db: mockDb,
    win: { minimize: vi.fn(), maximize: vi.fn(), close: vi.fn(), onMaximized: vi.fn(), onOrdersChanged: vi.fn() },
    edition: { getInfo: vi.fn(), checkTrial: vi.fn(), activate: vi.fn() },
  },
  writable: true,
})
