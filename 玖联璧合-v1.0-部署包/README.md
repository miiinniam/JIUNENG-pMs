# 玖联璧合 - 中越跨境物流管理系统

## Vercel 部署指南

### 📋 部署前准备

#### 1. 获取必要的 API 密钥

**Supabase（数据库）**
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目或使用现有项目
3. 进入 **Project Settings → API**
4. 复制 **Project URL** 和 **anon public** 密钥

**Gemini API（智能功能）**
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 获取 API 密钥

---

### 🚀 部署步骤

#### 方法一：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 进入部署包目录
cd "玖联璧合-v1.0-部署包"

# 4. 部署（会提示输入项目名称）
vercel

# 5. 生产环境部署
vercel --prod
```

#### 方法二：使用 GitHub 集成

1. 将部署包上传到 GitHub 仓库
2. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
3. 点击 **Import Project**
4. 选择 GitHub 仓库
5. 配置环境变量（见下文）
6. 点击 **Deploy**

---

### ⚙️ 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_USE_MOCK_DB` | `false` | 使用真实数据库 |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | `eyJxxx...` | Supabase 公开密钥 |
| `VITE_GEMINI_API_KEY` | `AIza...` | Gemini API 密钥 |

**配置路径**：Vercel Dashboard → 项目 → Settings → Environment Variables

---

### 🗄️ 数据库初始化

如果使用真实 Supabase，需要执行数据库迁移：

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入你的项目 → **SQL Editor**
3. 复制 `supabase-migration.sql` 或 `supabase-full-deploy.sql` 的内容
4. 点击 **Run** 执行

---

### ✅ 部署后检查

- [ ] 访问应用首页
- [ ] 测试登录功能
- [ ] 测试注册功能
- [ ] 验证核心业务流程

---

### 🔧 本地开发

如果需要在本地运行：

```bash
cd source

# 安装依赖
npm install

# 复制环境变量（本地使用 Mock 数据库）
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

---

### 📁 目录结构

```
玖联璧合-v1.0-部署包/
├── vercel.json          # Vercel 部署配置
└── source/              # 前端源码
    ├── src/              # React 组件和业务逻辑
    ├── public/           # 静态资源
    ├── package.json      # 依赖配置
    ├── vite.config.ts    # Vite 配置
    ├── tsconfig.json     # TypeScript 配置
    ├── .env.example      # 环境变量示例
    └── ...
```

---

### ❓ 常见问题

**Q: 部署后页面空白？**
A: 检查浏览器控制台是否有错误，确认环境变量已正确配置。

**Q: 登录失败？**
A: 确保 Supabase 数据库已初始化，且 `VITE_USE_MOCK_DB=false`。

**Q: 静态资源加载失败？**
A: 检查 `vite.config.ts` 中的 base 配置，生产环境可能需要设置为 `/`。

---

### 📞 技术支持

如有问题，请检查：
1. Vercel 部署日志
2. 浏览器开发者工具控制台
3. Supabase 项目状态
