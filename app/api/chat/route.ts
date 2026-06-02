import { createOpencode } from 'ai-sdk-provider-opencode-sdk'
import { streamText, convertToModelMessages } from 'ai'

export async function POST(req: Request) {
  const { messages, sessionId, sessionName } = await req.json()

  const opencode = createOpencode({ autoStartServer: true })

  const result = streamText({
    model: opencode('cubence/gpt-5.5'),
    system: `你是一个微信聊天分析助手。
当前会话：${sessionName || '未选择'}${sessionId ? `（ID: ${sessionId}）` : ''}。
当用户需要了解微信聊天记录、联系人或群组信息时，使用 weflow skill 获取数据后再分析。
如果用户询问当前会话的聊天记录，优先读取当前会话 ID：${sessionId || '未选择'}。
不要把会话 ID 重复展示给用户，除非用户明确要求。
回复请使用中文，分析要具体、有条理。`,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse({
    headers: {
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
