---
name: weflow
description: 获取微信聊天数据、会话列表、联系人和群成员信息。只负责数据读取命令和参数说明，不负责画像分析策略或聊天回复策略。
---

# WeFlow 微信数据获取工具

WeFlow 是一个本地服务，提供微信聊天数据的 HTTP API 接口。使用以下脚本获取数据。

## 前置条件

确保 WeFlow 服务已启动，API 功能已开启。服务地址默认 `http://127.0.0.1:5031`，可通过环境变量 `WEFLOW_BASE_URL` 覆盖。

脚本会自动读取项目根目录 `.env.local` 中的 `WEFLOW_ACCESS_TOKEN`，并同时通过 query 参数和 `Authorization` header 传给 WeFlow。

脚本路径（相对于项目根目录）：`.opencode/skills/weflow/weflow.mjs`

## 可用命令

### 获取会话列表
```bash
node .opencode/skills/weflow/weflow.mjs sessions [--keyword <搜索词>] [--limit <数量>]
```

返回微信会话，包含 `username`（会话 ID）、`displayName`、`type`、`sessionType`、`lastTimestamp`、`unreadCount`。

### 获取会话消息
```bash
node .opencode/skills/weflow/weflow.mjs messages --talker <会话ID> [--limit <数量>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--keyword <关键词>]
```

- `--talker`：必填，私聊填对方 wxid，群聊填 `xxx@chatroom`
- `--limit`：消息数量，默认 100，最大建议 10000
- `--start` / `--end`：时间范围，格式 `YYYYMMDD`
- `--keyword`：按内容关键词过滤

### 获取联系人
```bash
node .opencode/skills/weflow/weflow.mjs contacts [--keyword <搜索词>] [--limit <数量>]
```

返回联系人列表，包含 `username`、`displayName`、`remark`、`nickname`。

### 获取群成员
```bash
node .opencode/skills/weflow/weflow.mjs group-members --chatroom <群ID>
```

- `--chatroom`：必填，群 ID（格式 `xxx@chatroom`）

## 数据读取流程

1. 如果用户没有指定会话 ID，先运行 `sessions` 命令找到目标会话的 `username`。
2. 用获取到的 `username` 作为 `--talker` 参数运行 `messages` 命令获取聊天记录。
3. 将读取到的数据交给具体任务 skill 处理，例如人物画像分析或聊天助手回复。

## 示例

用户问「总结我和张三最近的聊天」：

1. 运行 `sessions --keyword 张三` 找到会话 ID。
2. 运行 `messages --talker <会话ID> --limit 200` 获取近期消息。
3. 根据聊天任务要求分析消息内容。
