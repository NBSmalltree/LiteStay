# LiteStay

民宿前台管理系统 — 纯本地单机版 PMS（Property Management System）

## 功能

- **房态总览** — 14 天房态矩阵，可视化查看房间占用情况，支持按天/按周导航
- **入住登记** — 点击空房格快速开房，填写客人信息、房费、押金、支付方式
- **订单管理** — 预订/在住/退房状态流转，续住、改价、退房操作
- **杂费录入** — 在订单详情或财务页面录入杂费，支持编辑和删除
- **财务收银** — 收入汇总卡片、支付方式占比饼图、流水明细表、Excel 导出

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron |
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 图表 | Recharts |
| 数据库 | SQLite（better-sqlite3） |
| 导出 | ExcelJS |
| 构建 | Vite + electron-builder |

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式（Vite + Electron 热更新）
npm run dev

# 仅启动 Web 开发服务器
npm run dev:web

# 构建
npm run build

# 打包 macOS 应用
npm run build:mac
```

## 项目结构

```
LiteStay/
├── electron/
│   ├── main.cjs          # Electron 主进程，数据库 & IPC
│   └── preload.cjs       # 预加载脚本，contextBridge
├── src/
│   ├── renderer/
│   │   ├── App.tsx       # 主界面，路由 & 布局
│   │   ├── components/   # 通用 UI 组件
│   │   └── features/
│   │       ├── room-matrix/   # 房态总览 & 入住/订单详情弹窗
│   │       ├── orders/        # 订单管理页
│   │       └── finance/       # 财务收银页
│   └── shared/
│       └── types.ts      # 共享类型定义
├── build/                # 应用图标
└── package.json
```

## 数据库

SQLite 数据库存储在 `~/Library/Application Support/LiteStay/LiteStay/database.sqlite`（macOS），包含以下表：

- `room_types` — 房型配置
- `rooms` — 房间信息
- `orders` — 订单（预订/在住/已退房）
- `financial_logs` — 财务流水（房费/押金/杂费）

## 许可

MIT
