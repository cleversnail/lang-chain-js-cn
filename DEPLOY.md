# 部署指南

本项目是一个 **VitePress 静态站点**，构建产物在 `docs/.vitepress/dist/`。

```bash
npm run docs:build      # 本地构建
npm run docs:preview    # 本地预览构建产物（http://localhost:4173）
npm run docs:dev        # 开发模式，热更新
```

分两步：**① 代码托管到 Gitee**（已完成），**② 部署到腾讯云**。

---

# ① 发布到 Gitee

已完成。仓库地址：

```
https://gitee.com/snail_wn/lang-chain-js-cn
```

当前状态：84 个文件，`main` 分支，`.env` / `myAgent/` / `docs/.vitepress/dist/` 均未入库。

## 后续推送

首次已用私人令牌推送过，**建议吊销该令牌并改用 SSH 免密**：

```bash
# 1. 把本机公钥贴到 Gitee → 设置 → SSH 公钥
cat ~/.ssh/id_ed25519.pub

# 2. 切换 remote 为 SSH
cd ~/Desktop/langChain
git remote set-url origin git@gitee.com:snail_wn/lang-chain-js-cn.git

# 3. 验证
ssh -T git@gitee.com
git push
```

## 关于 Gitee Pages

Gitee Pages 免费服务自 2024 年起对多数个人用户已关闭（需企业实名）。
本项目的正式访问地址用腾讯云托管即可，Gitee 只当代码仓库。

> 若将来 Gitee Pages 可用：其访问地址带子路径 `/<仓库名>/`，
> 需把 `docs/.vitepress/config.mts` 里的 `base: "/"` 改成 `base: "/lang-chain-js-cn/"` 再构建推送。

---

# ② 部署到腾讯云

## 环境准备（只需做一次）

### 1. 创建 CloudBase 环境

打开 https://console.cloud.tencent.com/tcb → **新建环境**（选按量计费即可）。

创建后记下**环境 ID**，形如 `langchainjs-zh-1g1a2b3c4d5e6f`。

> 本项目的静态托管走 CloudBase 的「静态网站托管」服务，环境创建后即可用。

### 2. 登录（三选一）

**A. 交互式登录（最简单）**

```bash
npx --yes -p @cloudbase/cli tcb login
```

会进入设备授权流程：终端打印一个网址和验证码，浏览器打开确认即可。
登录态会保存在本机，之后所有命令都不需要再登录。

**B. 环境 API Key 登录（无需浏览器，权限最小，推荐给自动化）**

在 CloudBase 控制台 → 环境 → 访问管理 / API Key 里创建一个**环境级 API Key**，然后：

```bash
npx --yes -p @cloudbase/cli tcb login \
  --cloudbase-api-key <你的环境APIKey> \
  -e <你的环境ID>
```

这样拿到的是**只能操作该环境**的凭据，比主账号密钥安全得多。

**C. 腾讯云主账号密钥（不推荐）**

```bash
npx --yes -p @cloudbase/cli tcb login --apiKeyId <SecretId> --apiKey <SecretKey>
```

除非使用**子账号**且已收敛权限，否则不建议把主账号的永久密钥交给任何人（包括 AI）。

> 💡 本机 npm 的全局目录是 `/usr/local`（需要 sudo），所以**不要**用
> `npm install -g @cloudbase/cli`。上面统一用 `npx --yes -p @cloudbase/cli tcb …`
> 调用，不装全局、不污染系统。

---

## 部署

一条命令搞定（会先类型检查、再构建、最后带校验发布）：

```bash
cd ~/Desktop/langChain
bash scripts/deploy-tencent.sh <你的环境ID>
```

或者用 npm script：

```bash
TCB_ENV_ID=<你的环境ID> npm run deploy:tencent
```

脚本内部做的事：

```bash
npm run typecheck                                   # 类型检查
npm run docs:build                                  # 构建到 docs/.vitepress/dist
npx --yes -p @cloudbase/cli tcb hosting deploy \
  docs/.vitepress/dist -e <环境ID> --verify          # 发布并校验
```

发布成功后会输出访问地址，通常形如：

```
https://<环境ID>.tcloudbaseapp.com/
```

## 常用参数

`tcb hosting deploy` 的实用选项：

| 参数 | 作用 |
| --- | --- |
| `--verify` | 发布后校验远端文件与本地一致（推荐） |
| `--safe` | 发布前备份，上传或校验失败自动回滚（二次发布后更稳妥） |
| `--prune` | 删除远端不属于本次发布的文件（**谨慎**，会清掉旧文件） |
| `--concurrency 1` | 网络不稳时降低并发 |
| `--ignore` | 忽略文件模式，逗号分隔 |

## 以后每次更新

```bash
npm run docs:build
bash scripts/deploy-tencent.sh <你的环境ID>
```

---

## 方案 B：腾讯云 Web 应用托管（从 Gitee 自动部署）

适合「push 到 Gitee 就自动重新发布」的流水线，不需要本地登录。

1. 打开 https://console.cloud.tencent.com/webify → 新建应用
2. 选择 **导入 Git 仓库** → 授权并选择 `snail_wn/lang-chain-js-cn`（公开仓库无需额外授权）
3. 构建配置：

   | 配置项 | 值 |
   | --- | --- |
   | 安装命令 | `npm install` |
   | 构建命令 | `npm run docs:build` |
   | 发布目录 | `docs/.vitepress/dist` |

4. 点部署。之后每次 `git push` 到 Gitee，Webify 会自动重新构建发布。

> 注意：`docs/.vitepress/dist/` 已加入 `.gitignore`，这是**故意的**——
> Webify 会在云端执行 `npm run docs:build` 自行构建，不需要提交产物。

---

## 部署前检查清单

- [ ] `npm run typecheck` 通过
- [ ] `npm run docs:build` 成功，`docs/.vitepress/dist/index.html` 存在
- [ ] `docs/.vitepress/config.mts` 中 `base` 与部署路径匹配（根路径部署保持 `"/"`）
- [ ] `.env` 未被提交（已在 `.gitignore`）
- [ ] `docs/.vitepress/dist/` 未被提交（已在 `.gitignore`）

---

## 排错

| 现象 | 原因与处理 |
| --- | --- |
| `无有效身份信息，请使用 tcb login 登录` | 未登录或登录态过期，重新执行登录 |
| `EACCES: permission denied, mkdir '/usr/local/lib/node_modules'` | 误用了 `npm install -g`；改用 `npx --yes -p @cloudbase/cli tcb …` |
| 部署成功但页面 404 | 检查 `base` 配置；根路径部署应为 `"/"` |
| 页面样式丢失 | 确认上传的是 `docs/.vitepress/dist`（整个目录），而不是里面的子目录 |
