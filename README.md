# LiteStay

B&B Front Desk Management System — A standalone local PMS (Property Management System)

A feature-complete, production-ready B&B front desk management system with bilingual support (Chinese/English).

🌐 **[中文文档 / Chinese Documentation](README_CN.md)**

## ✨ Features

### 🏠 Room Management
- **Room Matrix** — 14-day room status matrix with visual occupancy view, day/week navigation
- **Room Overview** — Room grid view with color-coded status (Vacant/In-House/Reserved/Cleaning), filter support
- **Room Type Management** — Standard Room, King Room, Twin Room, Deluxe Suite, Family Room configuration

### 📋 Order Management
- **Quick Check-in** — Click empty room to quickly check in, fill guest info, room fee, deposit, payment method
- **Order Search** — Global search box, real-time filtering by guest, room number, date
- **Advanced Search** — Collapsible panel with check-in/checkout date range search, 6 presets (Today, Yesterday, This Week, Last Week, This Month, Last Month)
- **Quick Room Change** — One-click room change with price difference handling, auto-update financial records
- **Order Status** — Reserved/In-House/Checked Out status flow, extend stay, price adjustment, checkout
- **Notes Field** — Record special requests (extra bed, pickup service, no smoking, etc.)

### 👥 Guest Management
- **Guest Profile** — Guest name, phone, ID card, email, notes
- **History Records** — Guest visit count, total spending, preferred room type, order history
- **Guest Search** — Fuzzy search by name, phone (debounce 300ms)
- **Check-in Search** — Auto-search and select returning guests during check-in

### 💰 Financial Management
- **Finance Dashboard** — Income summary cards, payment method pie chart, transaction details
- **Night Audit** — One-click daily financial report, support print and export
- **Incidental Charges** — Record incidental charges in order details or finance page, edit/delete support
- **Invoice Management** — Invoice info entry, status management (Pending/Issued/Cancelled), export list
- **Excel Export** — Financial transactions, night audit reports, invoice list export

### 📊 Data Analytics
- **Occupancy Statistics** — Today's occupancy rate, vacant rooms, today's check-in/check-out counts
- **Revenue Trend** — 30-day revenue trend chart (stacked by room type)
- **Room Type Analysis** — Revenue share pie chart, order count share pie chart
- **Revenue Analysis Report** — Monthly/Quarterly/Annual statistics, year-over-year growth, payment method trends
- **Guest Source Statistics** — Order source pie chart (Ctrip/Meituan/Direct Booking/Returning/Other)
- **ADR/RevPAR Metrics** — Average Daily Rate, Revenue Per Available Room, occupancy trend, room type comparison

### 💲 Pricing Strategy
- **Price Rules** — Support 4 rule types: Weekday, Weekend, Holiday, Custom
- **Flexible Pricing** — Price multiplier or fixed price, priority mechanism
- **Price Calendar** — 30-day price calendar with color coding (Base Price/Price Up/Price Down)
- **Auto Application** — Auto-apply price rules to calculate suggested price during check-in

### 🔔 Reminders & Notifications
- **Today's Check-in Reminder** — Blue reminder, number of reservations to check in
- **Tomorrow's Check-out Reminder** — Yellow reminder, number of rooms to check out
- **Overdue Order Reminder** — Red reminder, number of overdue orders
- **Click to Navigate** — Click reminder to auto-navigate to order page with filter applied

### 💾 Data Security
- **Data Backup** — Create, restore, export, import backups
- **Backup Management** — Backup list, statistics, file size display
- **Safe Restore** — Pre-restore validation, auto-restore on failure, delete confirmation
- **System Integration** — Export (Save Dialog), Import (Open Dialog)

### 🌐 Internationalization
- **Bilingual Support** — Complete Chinese/English translation coverage
- **Language Switch** — Title bar language toggle button (EN/中)
- **Auto Detection** — Browser language auto-detection
- **Translation Coverage** — Navigation, pages, buttons, forms, headers, prompts (340+ translation keys)

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Electron |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Charts | Recharts (Line/Bar/Area/Pie Chart)|
| Database | SQLite (better-sqlite3)|
| Export | ExcelJS |
| Internationalization | react-i18next + i18next |
| Build | Vite + electron-builder |

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
# Start development mode (Vite + Electron hot reload)
npm run dev

# Start web development server only
npm run dev:web
```

### Build and Package

```bash
# Build frontend
npm run build

# Package macOS app
npm run build:mac

# Package Windows app
npm run build:win

# Package Linux app
npm run build:linux
```

## 📁 Project Structure

```
LiteStay/
├── electron/
│   ├── main.cjs          # Electron main process, database & IPC
│   └── preload.cjs       # Preload script, contextBridge
├── src/
│   ├── renderer/
│   │   ├── App.tsx       # Main interface, routing & layout
│   │   ├── main.tsx      # Entry file
│   │   ├── index.css     # Global styles
│   │   ├── i18n/         # Internationalization config
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── zh.json  # Chinese translations
│   │   │       └── en.json  # English translations
│   │   ├── components/   # Common UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── RoomTypeManager.tsx
│   │   └── features/
│   │       ├── room-matrix/    # Room matrix & check-in/order detail dialogs
│   │       ├── room-overview/  # Room overview
│   │       ├── analytics/      # Data analytics page
│   │       ├── orders/         # Order management page
│   │       ├── guests/         # Guest management page
│   │       ├── pricing/        # Pricing strategy page
│   │       ├── backup/         # Data backup page
│   │       ├── invoices/       # Invoice management page
│   │       └── finance/        # Finance dashboard page
│   └── shared/
│       └── types.ts      # Shared type definitions
├── build/                # App icons
├── TODO.md               # Feature todo list
└── package.json
```

## 🗄️ Database

SQLite database is stored at `~/Library/Application Support/LiteStay/LiteStay/database.sqlite` (macOS), containing the following tables:

### Core Tables

- **room_types** — Room type configuration (Standard Room, King Room, Twin Room, Deluxe Suite, Family Room)
- **rooms** — Room information (room number, room type, base price)
- **orders** — Orders (guest, check-in/checkout dates, room fee, deposit, status, source)
- **financial_logs** — Financial transactions (Room Fee/Deposit/Incidental, payment method, amount)

### Extension Tables

- **guests** — Guest profiles (name, phone, ID card, email, notes)
- **price_rules** — Price rules (room type, rule type, price adjustment, priority)
- **invoices** — Invoice information (title, tax number, bank info, status)

## 🌍 Internationalization

The application supports bilingual interface (Chinese/English):

- **Chinese (zh)** — Default language
- **English (en)** — Complete translation support

### Translation Coverage

- ✅ Navigation menus
- ✅ Page titles and subtitles
- ✅ Button text
- ✅ Form labels
- ✅ Table headers
- ✅ Prompt messages
- ✅ Status labels
- ⚠️ Database content (kept as-is, not translated)

### Language Switch

Click the language toggle button (EN/中) in the top-right corner of the title bar to switch languages. Language settings are automatically saved.

## 📊 Feature Statistics

- **Page Count**: 8
- **Component Count**: 12+
- **Database Tables**: 8
- **IPC Handlers**: 45+
- **TypeScript Interfaces**: 35+
- **Translation Keys**: 340+

## 🎯 Key Metrics

### ADR (Average Daily Rate)
- Formula: Total Room Fee / Sold Room Nights
- Purpose: Measures average price of sold rooms, reflects pricing strategy

### RevPAR (Revenue Per Available Room)
- Formula: Total Room Fee / Available Room Nights
- Purpose: Measures revenue efficiency of all available rooms, considering both occupancy and price

### Relationship
- RevPAR = ADR × Occupancy Rate

## 📦 Packaging & Release

### macOS

```bash
npm run build:mac
```

Output file: `release/LiteStay-1.0.0.dmg`

### Windows

```bash
npm run build:win
```

Output file: `release/LiteStay Setup 1.0.0.exe`

### Linux

```bash
npm run build:linux
```

Output file: `release/LiteStay-1.0.0.AppImage`

## 🔧 Development Notes

### IPC Communication

All database operations use IPC communication:
- Main Process: `electron/main.cjs` — Database operations, business logic
- Preload: `electron/preload.cjs` — Expose APIs to renderer process
- Renderer: `src/renderer/` — UI interface, user interactions

### Database Migration

App automatically checks and executes database migrations on startup:
- Add missing fields
- Create new tables
- Maintain data compatibility

### Code Style

- TypeScript strict mode
- React functional components + Hooks
- Tailwind CSS styling
- Chinese comments and documentation

## 📝 Changelog

### v1.0.0 (2026-06-23)

#### Core Features
- Room Matrix (14-day room status view)
- Order Management (Check-in, edit, status flow)
- Finance Dashboard (Income summary, transaction details, Excel export)

#### Advanced Features
- Guest history records and profile management
- Pricing strategy management (rules, calendar, auto-apply)
- Data backup and restore
- Invoice management
- Data analytics (Occupancy, Revenue, Source, ADR/RevPAR)
- Bilingual interface (Chinese/English)

#### Optimizations
- Quick room change (price difference handling)
- Order advanced search (date range, presets)
- Occupancy statistics panel
- Notes field
- Reminders & notifications
- Night audit function

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

## 👨‍💻 Author

NBSmalltree

## 🙏 Acknowledgments

- React - UI Framework
- Electron - Desktop Application Framework
- Tailwind CSS - CSS Framework
- Recharts - Chart Library
- better-sqlite3 - SQLite Binding
- ExcelJS - Excel Generation Library
- react-i18next - Internationalization Framework

---

**LiteStay** — Making B&B management simpler and more efficient! 🏠✨
