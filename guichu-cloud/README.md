# 归处 · 云开发服务端（正式版功能）

> 前置条件：已有正式 AppID（见 ../guichu-miniprogram/RELEASE.md 第 0 步）。本文件夹**不参与小程序打包**，属于部署到微信云开发的服务端代码。

## 这个文件夹是什么

| 文件 | 作用 |
|---|---|
| `cloudfunctions/guichu-api/index.js` | 一个云函数包含四个能力：**openid 绑定**（微信账号 ↔ 成员身份）、**AI 代理**（Key 藏服务端，全家共用你的免费额度且不怕解包）、**syncPush/syncPull**（数据上云，多设备/家人共享基础） |
| `cloudfunctions/guichu-api/package.json` | 依赖声明（wx-server-sdk） |

## 部署步骤（约 20 分钟）

1. 开发者工具打开 `guichu-miniprogram`（已换成正式 AppID）→ 工具栏「云开发」→ 开通。**注意：开通页一般只提供 ¥19.9/月 套餐**（个人版连续订阅或单月；个别账号可能看到免费环境，以实际页面为准）。云开发是可选升级，不开通不影响发布。
2. 在云开发控制台「数据库」创建集合：`guichu_data`（权限选"仅创建者可读写"）。
3. 在项目里新建 `guichu-miniprogram/cloudfunctions/` 目录，把本文件夹的 `guichu-api/` 整个复制进去（开发者工具声明 cloudfunctionRoot 后，云函数目录不会被打进小程序包）。
4. 右键 `guichu-api` →「上传并部署：云端安装依赖」。
5. 云开发控制台 → 云函数 → guichu-api → 配置 → 环境变量：添加 `AI_KEY` = 你的智谱 Key。
6. 测试：控制台「云函数测试」发送 `{"action":"getOpenid"}`，返回 `{"ok":true,"openid":"o..."}` 即成功。

## 客户端接入（部署完成后我来改，两处小改动）

1. AI 请求从 `wx.request(bigmodel)` 改为 `wx.cloud.callFunction({ name: 'guichu-api', data: { action: 'aiProxy', messages } })` —— 用户从此**零配置**，Key 也不在包里。
2. 成员档案加 `openid` 字段：`getOpenid` 返回值写入当前成员 → 家人共享与同步按 openid 归属。

## 安全说明

- `AI_KEY` 只存在于云函数环境变量，客户端代码和小程序包里都不出现。
- `guichu_data` 集合按 openid 隔离，用户只能读写自己的数据。
- 当前 syncPush/Pull 为整包覆盖（个人多设备够用）；家庭共享需要增量合并，属下一步。
