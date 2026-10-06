# 部署指南

本项目的静态站点由 **VitePress** 构建，产物在 `docs/.vitepress/dist/`。

```bash
npm run docs:build      # 本地构建，产物 -> docs/.vitepress/dist
npm run docs:preview    # 本地预览构建产物（默认 http://localhost:4173）
npm run docs:dev        # 开发模式，改文件即时热更新
```

下面分两步：**① 代码托管到 Gitee**，**② 部署到腾讯云**。

---

# ① 发布到 Gitee

## 1. 在 Gitee 建仓库

登录 https://gitee.com → 右上角 `+` → **新建仓库**。

- 仓库名建议：`langchainjs-zh`
- 是否开源：公开 / 私有都行（腾讯云拉取时若为私有需要配好授权）
- **不要**勾选「初始化仓库」（因为本地已经有代码了）

建好后你会得到一个地址，形如：

```
https://gitee.com/<你的用户名>/langchainjs-zh.git
```

## 2. 关联远程仓库并推送

```bash
cd ~/Desktop/langChain

# 关联远程（把下面的用户名换成你的）
git remote add origin https://gitee.com/<你的用户名>/langchainjs-zh.git
git branch -M main
git push -u origin main
```

推送时会要求输入 **Gitee 用户名**和**密码**。

> ⚠️ 如果你开了两步验证，密码要换成 **私人令牌（Token）**：
> Gitee → 设置 → 私人令牌 → 生成新令牌（勾选 `projects` 权限）。
> 把令牌当成密码填进去即可。

### 用 SSH 也可以（免密，推荐长期使用）

```bash
ssh-keygen -t ed25519 -C "你的邮箱"     # 一路回车
cat ~/.ssh/id_ed25519.pub               # 复制输出内容
# 粘贴到 Gitee → 设置 → SSH 公钥
git remote set-url origin git@gitee.com:<你的用户名>/langchainjs-zh.git
git push -u origin main
```

## 3. 关于 Gitee Pages

Gitee Pages 免费服务自 2024 年起对多数用户已关闭（需企业实名认证才可开通）。
**如果你只是要一个访问地址，直接用下面的腾讯云托管就够了**，Gitee 只当代码仓库用。

如果你确实能用 Gitee Pages：
1. 仓库页 → 服务 → Gitee Pages → 部署分支选 `main`（或 `gh-pages`），目录留空
2. 注意：Gitee Pages 的访问地址带子路径 `/<仓库名>/`，
   需要把 `docs/.vitepress/config.mts` 里的 `base: "/"` 改成 `base: "/langchainjs-zh/"` 再重新构建、推送

---

# ② 部署到腾讯云

推荐 **腾讯云开发 CloudBase 静态网站托管**——最省事，一条命令发布，自带 CDN 和 HTTPS。

## 方案 A：CloudBase 静态托管（推荐）

### 1. 准备

```bash
# 安装腾讯云官方 CLI（全局装一次）
npm install -g @cloudbase/cli
```

到 https://console.cloud.tencent.com/tcb 创建一个环境（选按量计费即可），
记下**环境 ID**（形如 `langchainjs-zh-1gxxxxxx`）。

### 2. 登录并部署

```bash
cd ~/Desktop/langChain

# 登录（会弹出浏览器授权）
tcb login

# 构建站点
npm run docs:build

# 部署到静态托管（-e 后面填你的环境 ID）
tcb hosting deploy docs/.vitepress/dist -e <你的环境ID>
```

部署成功后会输出访问地址，形如：

```
https://<环境ID>.tcloudbaseapp.com/
```

### 3. 以后每次更新

```bash
npm run docs:build && tcb hosting deploy docs/.vitepress/dist -e <你的环境ID>
```

> 💡 也可以把 `cloudbaserc.json` 里的 `{{env.ENV_ID}}` 换成真实环境 ID，
> 之后直接跑 `tcb framework deploy` 自动完成「构建 + 部署」。

## 方案 B：腾讯云 Web 应用托管（从 Gitee 自动构建）

适合「push 到 Gitee 就自动重新部署」的流水线。

1. 打开 https://console.cloud.tencent.com/webify
2. 新建应用 → 选择 **导入 Git 仓库** → 授权并选择你的 Gitee 仓库
3. 构建配置填：

   | 配置项 | 值 |
   | --- | --- |
   | 安装命令 | `npm install` |
   | 构建命令 | `npm run docs:build` |
   | 发布目录 | `docs/.vitepress/dist` |

4. 点部署。之后每次 `git push` 到 Gitee，Webify 会自动重新构建发布。

---

# 需要你提供的信息

我（AI）无法代替你登录账号，请提供下面任一信息后，我可以继续帮你把命令跑完：

| 平台 | 需要什么 |
| --- | --- |
| Gitee | 仓库地址（`https://gitee.com/用户名/仓库名.git`）+ 推送用的用户名和令牌；或者你自己已配好 SSH 的话，我直接跑 `git push` |
| 腾讯云 | 环境 ID。`tcb login` 需要你在浏览器里点授权（这步必须你本人操作） |

---

# 部署前检查清单

- [ ] `npm run docs:build` 能成功
- [ ] `docs/.vitepress/dist/` 里有 `index.html`
- [ ] `.env` 没有被提交（已在 `.gitignore` 里）
- [ ] `docs/.vitepress/dist/` 没有被提交（已在 `.gitignore` 里）
