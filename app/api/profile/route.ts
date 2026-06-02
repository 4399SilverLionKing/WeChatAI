import fs from 'node:fs/promises'
import { createOpencode } from 'ai-sdk-provider-opencode-sdk'
import { generateText } from 'ai'
import { getMessages, type Message } from '@/lib/weflow'
import { readProfile, saveProfile, type StructuredProfile } from '@/lib/profile'

const MESSAGE_LIMIT = 10000

function formatTime(timestamp: number | undefined) {
  if (!timestamp) return 'unknown-time'
  return new Date(timestamp * 1000).toISOString()
}

function messageToLine(message: Message) {
  const direction = message.isSelf || message.isSend ? 'me' : 'other'
  const sender = message.senderName ?? message.sender ?? message.senderUsername ?? direction
  const content = message.content ?? message.text ?? message.parsedContent ?? message.rawContent ?? ''
  const text = content.length > 500 ? `${content.slice(0, 500)}...` : content

  return `[${formatTime(message.createTime ?? message.timestamp)}] ${direction} ${sender}: ${text}`
}

function parseJsonObject(text: string) {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  return JSON.parse(fenced ? fenced[1] : trimmed) as StructuredProfile
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const talker = searchParams.get('talker')

  if (!talker) {
    return Response.json({ success: false, error: 'Missing talker' }, { status: 400 })
  }

  const profile = await readProfile(talker)
  return Response.json({ success: true, profile })
}

export async function POST(req: Request) {
  const { talker, displayName } = await req.json() as {
    talker?: string
    displayName?: string
  }

  if (!talker) {
    return Response.json({ success: false, error: 'Missing talker' }, { status: 400 })
  }

  try {
    const [messages, skill] = await Promise.all([
      getMessages(talker, MESSAGE_LIMIT),
      fs.readFile('.opencode/skills/profile-analysis/SKILL.md', 'utf8'),
    ])

    const opencode = createOpencode({ autoStartServer: true })
    const chatLog = messages.map(messageToLine).join('\n')
    const generatedAt = new Date().toISOString()

    const result = await generateText({
      model: opencode('cubence/gpt-5.5'),
      maxOutputTokens: 8000,
      timeout: 300000,
      system: `你是一个严谨的人物画像分析师。必须遵守下面 profile-analysis skill，只基于给定聊天记录做判断。

${skill}`,
      prompt: `请为以下微信会话对象生成一份详尽的人物画像分析，并输出 Markdown。
严格输出符合 profile-analysis skill 的 JSON 对象，不能输出 JSON 之外的文字。

会话对象：${displayName || talker}
talker：${talker}
消息数量：${messages.length}
生成时间：${generatedAt}

<chat_history>
${chatLog}
</chat_history>`,
    })
    const structuredProfile = parseJsonObject(result.text)

    const profile = await saveProfile({
      talker,
      profile: structuredProfile,
      messages,
      metadata: {
        talker,
        displayName,
        messageCount: messages.length,
        generatedAt,
        source: 'WeFlow /api/v1/messages',
        limit: MESSAGE_LIMIT,
      },
    })

    return Response.json({ success: true, profile })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate profile',
      },
      { status: 500 }
    )
  }
}
