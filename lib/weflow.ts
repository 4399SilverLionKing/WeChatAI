const BASE = process.env.WEFLOW_BASE_URL || 'http://127.0.0.1:5031'
const ACCESS_TOKEN = process.env.WEFLOW_ACCESS_TOKEN || 'disabled'

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  }
}

function buildApiUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`/api/v1${path}`, BASE)
  url.searchParams.set('access_token', ACCESS_TOKEN)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const res = await fetch(buildApiUrl(path, params), {
    method: 'GET',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`WeFlow ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(new URL('/api/v1/health', BASE), {
    method: 'GET',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`WeFlow health ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

export type Session = {
  username: string
  displayName: string
  type: string | number
  lastTimestamp: number
  unreadCount: number
}

export type Contact = {
  username: string
  displayName: string
  remark: string
  nickname: string
  alias: string
  avatarUrl: string
  type: string
}

export type Message = {
  id?: string | number
  msgId?: string | number
  localId?: string | number
  serverId?: string | number
  talker?: string
  sender?: string
  accountName?: string
  senderName?: string
  senderUsername?: string
  content?: string
  text?: string
  rawContent?: string
  parsedContent?: string
  type?: string | number
  localType?: string | number
  timestamp?: number
  createTime?: number
  isSelf?: boolean
  isSend?: boolean | number
  platformMessageId?: string | number
}

type MessagesResponse = {
  messages?: Message[]
}

type ChatLabMessagesResponse = {
  messages?: Message[]
  sync?: {
    hasMore?: boolean
    nextOffset?: number
  }
}

export async function getSessions(keyword?: string, limit?: number): Promise<Session[]> {
  const data = await get<{ sessions: Session[] }>('/sessions', { keyword, limit })
  return data.sessions ?? []
}

export async function getContacts(keyword?: string, limit = 100): Promise<Contact[]> {
  const data = await get<{ contacts: Contact[] }>('/contacts', { keyword, limit })
  return data.contacts ?? []
}

export async function getMessages(talker: string, limit = 100): Promise<Message[]> {
  const target = Math.max(0, Math.floor(limit))
  if (!target) return []

  const loadRawMessages = async () => {
    const data = await get<MessagesResponse>('/messages', { talker, limit: target })
    return data.messages ?? []
  }

  try {
    const messages: Message[] = []
    let offset = 0

    while (messages.length < target) {
      const pageLimit = Math.min(5000, target - messages.length)
      const data = await get<ChatLabMessagesResponse>(
        `/sessions/${encodeURIComponent(talker)}/messages`,
        { limit: pageLimit, offset }
      )
      const pageMessages = data.messages ?? []

      if (pageMessages.length === 0) break

      messages.push(...pageMessages)

      if (!data.sync?.hasMore) break

      const nextOffset = Number(data.sync.nextOffset)
      offset = Number.isFinite(nextOffset) && nextOffset > offset
        ? nextOffset
        : offset + pageMessages.length
    }

    if (messages.length > 0) return messages
  } catch {
    // Fall back to the raw messages endpoint below.
  }

  return loadRawMessages()
}
