# 部署指南

本项目是一个 **VitePress 静态站点**，构建产物在 `docs/.vitepress/dist/`。

```bash
npm run docs:build      # 本地构建
npm run docs:preview    # 本地预览构建产物（http://localhost:4173）
npm run docs:dev        # 开发模式，热更新
```

分两步：**① 代码托管到 Gitee**（已完成），**② 部署到腾讯云**。

---

# ⓪ 双远端同步规则（重要）

本项目有**两个远端仓库**，内容必须保持同步：

| 远端名 | 平台 | 地址 | 作用 |
| --- | --- | --- | --- |
| `origin` | Gitee | https://gitee.com/snail_wn/lang-chain-js-cn | 国内主仓库 |
| `github` | GitHub | https://github.com/cleversnail/lang-chain-js-cn | 海外 + GitHub Pages 的源 |

**规则：每次提交代码或更新文档，两个远端都要推，不能只推一个。**

已配置成「一条 push 同时发往两边」（只需配置一次）：

```bash
git remote set-url --push origin https://gitee.com/snail_wn/lang-chain-js-cn.git
git remote set-url --add --push origin https://github.com/cleversnail/lang-chain-js-cn.git
```

之后同步两边只要一条命令：

```bash
git push origin main        # → 同时推 Gitee 和 GitHub
```

验证配置（`origin` 应显示两行 push）：

```bash
git remote -v
```

> - 只想推 GitHub：`git push github main`
> - `origin` 现在语义是「两边都推」，不再是「只推 Gitee」

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

# ② 部署到 GitHub Pages

**线上地址：https://cleversnail.github.io/lang-chain-js-cn/**

## 站点与源码分开（两个分支）

| 分支 | 内容 | 用途 |
| --- | --- | --- |
| `main` | 整个项目（章节文档 + 可运行示例 + 站点源码） | 读者看源码 / `git clone` |
| `gh-pages` | **只有构建好的静态站点** | Pages 从这里发布 |

Pages 设置为「Deploy from a branch → `gh-pages` → `/`」。

所以**部署出去只有文档，不含项目源码**——实测访问站点里的
`package.json`、`lib/model.ts` 均为 404。

## base 路径（关键，两平台不同）

GitHub Pages 项目站点是**子路径**，`base` 必须是 `/<仓库名>/`：

```bash
npm run docs:build              # 默认 base = /lang-chain-js-cn/
```

部署到根路径（自有域名 / 腾讯云 CloudBase）时：

```bash
DOCS_BASE=/ npm run docs:build  # base = /
```

## 更新发布流程

```bash
# 1. 构建（默认子路径，适配 GitHub Pages）
npm run docs:build

# 2. 把产物铺到 gh-pages 分支
#    用独立 worktree，避免污染主工作区（dist 在 .gitignore 里，不能直接切分支）
cp -R docs/.vitepress/dist /tmp/ghp-dist
git worktree add -f /tmp/ghp-tree gh-pages
cd /tmp/ghp-tree
git rm -rq --ignore-unmatch .      # 清掉旧产物（含哈希名已变的旧资源）
cp -R /tmp/ghp-dist/. .
touch .nojekyll                    # 防止 Jekyll 干扰
git add -A
git -c user.name="蜗牛" -c user.email="652501825@qq.com" commit -m "deploy: 重新发布站点"
git push github gh-pages
cd -
git worktree remove /tmp/ghp-tree --force && rm -rf /tmp/ghp-dist

# 3. 触发一次 Pages 构建（推送 gh-pages 有时不会自动触发）
gh api -X POST repos/cleversnail/lang-chain-js-cn/pages/builds

# 4. 源码也同步到两个远端
git push origin main
```

## 首次配置（已完成，备查）

```bash
# 启用 Pages，来源 = gh-pages 分支
gh api -X PUT repos/cleversnail/lang-chain-js-cn/pages \
  -f build_type=legacy -f "source[branch]=gh-pages" -f "source[path]=/"
```

## 已知问题

- **GitHub Actions 跑不起来**：工作流失败，作业从未分配到 runner
  （`runner_name` 为空、`steps` 为空、4 秒就结束）。Actions 设置本身正常
  （公开仓库、已启用、非新账号）。真实原因只在网页 UI 显示，暂未排查。
  → 因此改用 `gh-pages` 分支发布，**完全不依赖 Actions**。
- **网络**：本机 `github.com`（git/网页）与 `api.github.com`、`codeload.github.com`、
  `*.github.io` 均可达（走本机代理，DNS 返回 `198.18.0.x` 假 IP 属正常现象）。

---

# ③ 部署到腾讯云

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
