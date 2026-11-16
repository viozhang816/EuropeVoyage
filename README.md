# 欧洲之旅 · 双人实时协作

保留原 HTML 的行程、预订、清单和待决定四个页面。两人分别登录，同一字段的文字使用 Yjs 合并；新增、删除、勾选与负责人共享。页面显示在线成员和正在编辑的字段，可导出 JSON 备份。

## 部署到 Vercel

1. 在 https://liveblocks.io 注册并新建项目，在项目设置取得 **Secret key**（`sk_` 开头）。密钥只填入 Vercel，不能写入前端代码。
2. 在 Liveblocks 创建房间 `europe-trip-v1`，默认访问权限设置为空（private）。本项目的后端通过登录会话授予这两个账号访问权限。
3. 将本文件夹中的项目上传到一个 **私有 GitHub 仓库**，然后在 Vercel 选择 Add New → Project，导入该仓库。
4. Framework 选 Vite，Build Command 用 `npm run build`，Output Directory 用 `dist`，Node.js 选 22 或更新的受支持版本。
5. 在 Vercel 项目的 Environment Variables 添加以下四项，至少选中 Production；若需要预览部署也能协作，则同时选 Preview：

| 变量 | 填写内容 |
| --- | --- |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks 项目的 Secret key |
| `SESSION_SECRET` | 随机生成且至少 32 位的字符串，用于签名登录会话 |
| `EDITOR_1_PASSWORD` | Yuwen 的独立长密码，至少 16 位 |
| `EDITOR_2_PASSWORD` | Yingyue 的独立长密码，至少 16 位 |

6. 点击 Deploy。修改环境变量后需要 Redeploy 才能生效。将网址交给另一位，各自选账号、输入自己的密码。
7. 如 Liveblocks 项目启用了域名限制，在 Liveblocks 允许列表添加实际 Vercel 部署域名及自定义域名。

无需在 Vercel 运行 WebSocket 服务器：Vercel 提供页面和登录接口，Liveblocks 提供实时通信与持久化。费用及额度以两家服务当前控制台为准。

## 上线后的验收

用两个不同浏览器或一个普通窗口加一个无痕窗口，分别登录账号 1、2：

1. 打开同一天备注，两边同时在不同位置输入文字，确认内容汇合。
2. 在同一字段使用中文输入法，同时让另一边输入，确认双方修改均保留。
3. 一边新增清单项目，另一边勾选现有项目；确认没有重复行或错位。
4. 刷新两边，确认云端内容仍存在。
5. 暂时断网，检查页面显示连接中断；重新联网后，等待“已同步”再关闭页面。
6. 退出后刷新，确认必须重新登录，且无法通过 `/api/seed` 读取原始行程。

## 保存和边界

首次连接时会载入原 HTML 中的全部数据，此后已有云端内容优先。重新部署不会重置旅行内容。原始行程中的日期、酒店、票务与待确认事项均按文件保留，未擅自改动。

文字按字符合并；下拉框和勾选项由最后到达的更新决定。删除行时，如果另一人正在编辑该行，删除会生效。当前提供字段级的编辑提示，未实现 Google Docs 的逐字符彩色光标或版本历史界面。断网期间未确认保存的内容需要保持当前页面打开；本项目没有启用离线持久缓存。

备份按钮下载当前 JSON；当前没有一键导入或历史恢复功能。

## 本地开发

安装 Node.js 22+ 后运行 `npm install`。`npm run build` 构建前端。完整登录和 API 需要 Vercel Functions，请使用 `npx vercel dev`；单独运行 Vite 不会提供 `/api` 接口。Cookie 带 Secure 标记，本地完整登录测试应使用 HTTPS 或 Vercel 的 HTTPS 预览部署。

## 本次验证范围

已检查 JavaScript 语法、JSON 配置、原始数据完整性以及未登录和伪造会话被拒绝。本次环境无法安装 npm 依赖，因此尚未完成 Vite 构建、浏览器交互和双人联机实测；配置 Liveblocks 与 Vercel 后，必须执行上面的验收步骤。本包为待部署验证版本。

参考文档：https://liveblocks.io/docs/api-reference/liveblocks-yjs 、https://liveblocks.io/docs/api-reference/liveblocks-client 、https://liveblocks.io/docs/api-reference/liveblocks-node
