<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/NextAuth-v5-6C47FF?logo=auth0" alt="NextAuth">
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<h1 align="center">财芽 CaiYa</h1>

<p align="center">
  <strong>财富的萌芽，从理性投资学习开始</strong>
  <br/>
  面向新手的 A 股投资理财学习平台
</p>

---

## 功能

<table>
  <tr>
    <td width="50%">
      <h4>📊 模拟交易</h4>
      <p>200,000 虚拟资金，实时 K 线图（含成交量），限价买卖，自动计算手续费（万 2.5）和印花税（千 1），涨跌停校验</p>
    </td>
    <td width="50%">
      <h4>📈 仪表盘</h4>
      <p>资产总览、持仓盈亏实时计算、交易历史记录、学习提醒</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h4>📝 论坛社区</h4>
      <p>行情讨论、复盘分享、投资交流，支持分类浏览</p>
    </td>
    <td width="50%">
      <h4>📚 课程学习</h4>
      <p>K 线入门、PE/PB 估值、均线系统、成交量分析、交易心理学、风险管理 — 6 门课程 36 节课</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h4>🤖 AI 分析</h4>
      <p>接入大模型，获取技术面与基本面分析视角（支持 OpenAI / Claude 兼容 API）</p>
    </td>
    <td width="50%">
      <h4>⚡ 策略回测</h4>
      <p>均线金叉/死叉、RSI、MACD 策略，夏普比率、最大回撤、胜率分析</p>
    </td>
  </tr>
</table>

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript |
| 数据库 | PostgreSQL 16 + Prisma 7 |
| 认证 | NextAuth.js v5 (JWT + OAuth) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui v4 |
| 图表 | lightweight-charts v5 |
| 校验 | Zod v4 |
| 部署 | Docker Compose |

## 本地开发

### 环境要求

- Node.js 20+
- Docker Desktop
- Python 3.10+（数据脚本）

### 1. 启动数据库

```bash
docker compose -p caiya up -d
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，至少修改 AUTH_SECRET
```

### 3. 初始化数据库

```bash
npx prisma db push          # 同步表结构
python3 scripts/generate_test_data.py  # 生成 20 只 A 股模拟数据
```

### 4. 启动开发服务器

```bash
npm install
npm run dev                  # http://localhost:3000
```

### 5. 开始使用

1. 注册账号 → 确认风险告知书 → 进入交易页
2. 搜索股票代码（如 `000001` 平安银行）查看 K 线
3. 模拟买入/卖出，体验完整交易流程

## 项目结构

```
src/
├── app/
│   ├── (auth)/              # 登录 / 注册 / 风险告知
│   ├── (dashboard)/         # 仪表盘 / 交易 / 论坛 / 课程 / AI / 回测 / 个人
│   └── api/                 # RESTful API 路由
├── components/
│   ├── chart/               # K 线图组件
│   ├── layout/              # Header / Sidebar / Providers
│   └── ui/                  # shadcn/ui 组件库
├── lib/
│   ├── auth.ts              # NextAuth 配置
│   ├── trade-engine.ts      # 交易计算引擎（费用/持仓/盈亏/校验）
│   ├── compliance.ts        # 合规管理
│   ├── validations.ts       # Zod 输入校验
│   └── prisma.ts            # 数据库客户端
└── types/                   # TypeScript 类型定义
```

## 路线图

- [x] 用户注册/登录（Credentials + GitHub + Google OAuth）
- [x] 风险告知书合规流程
- [x] 模拟交易引擎（买入/卖出/费用/涨跌停/停牌校验）
- [x] K 线图 + 成交量渲染
- [x] 仪表盘实时资产概览
- [x] 股票搜索 + 热门股票快捷入口
- [x] 论坛社区页面
- [x] 课程学习页面
- [x] 策略回测页面
- [ ] 论坛发帖/评论功能
- [ ] AI 分析集成（接入大模型）
- [ ] 策略回测引擎实现
- [ ] 课程内容页面
- [ ] 个人中心完善
- [ ] 真实行情数据接入
- [ ] 测试覆盖
- [ ] CI/CD 部署

## License

MIT
