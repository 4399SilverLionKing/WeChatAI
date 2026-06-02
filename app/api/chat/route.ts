import fs from 'node:fs/promises'
import { createOpencode } from 'ai-sdk-provider-opencode-sdk'
import { streamText, convertToModelMessages } from 'ai'
import { getProfilePath } from '@/lib/profile'

export async function POST(req: Request) {
  const { messages, sessionId, sessionName } = await req.json()

  const opencode = createOpencode({ autoStartServer: true })
  const chatSkill = await fs.readFile('.opencode/skills/wechat-chat/SKILL.md', 'utf8')
  const profilePath = sessionId ? getProfilePath(sessionId) : ''

  const result = streamText({
    model: opencode('cubence/gpt-5.5'),
    system: `你是一个微信聊天分析助手。
当前会话：${sessionName || '未选择'}${sessionId ? `（ID: ${sessionId}）` : ''}。
当前画像文件路径：${profilePath || '未选择会话，暂无画像路径'}。

请遵守下面 wechat-chat skill。需要读取微信数据时，使用 weflow skill 的命令；需要人物背景时，优先读取当前画像文件。

${chatSkill}`,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse({
    headers: {
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
