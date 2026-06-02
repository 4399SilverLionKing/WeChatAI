'use client'

import { useChat } from '@ai-sdk/react'
import { ArrowLeft, RefreshCw, Send, UserRound } from 'lucide-react'
import { DefaultChatTransport } from 'ai'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import type { UIMessage } from 'ai'

type ProfileResponse = {
  success: boolean
  profile?: {
    exists: boolean
    content: string
    structured: StructuredProfile | null
    updatedAt: string | null
    path: string
  }
  error?: string
}

type BasicProfileField = {
  key: string
  label: string
  value: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  evidence?: string
}

type StructuredProfile = {
  schemaVersion: 1
  displayName: string
  talker: string
  generatedAt: string
  summary: string
  basicInfo: BasicProfileField[]
  analysisMarkdown: string
}

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text'; text: string }).text)
    .join('')
}

function isKnownBasicInfo(field: BasicProfileField) {
  const value = field.value.trim().toLowerCase()
  return field.confidence !== 'unknown' && value !== '' && value !== '未知' && value !== 'unknown'
}

function isLongBasicInfo(field: BasicProfileField) {
  return field.value.length > 18 || ['importantPeople', 'interests', 'sensitiveTopics'].includes(field.key)
}

function ChatContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''
  const sessionName = searchParams.get('name') || sessionId || '未选择会话'
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState('')
  const [structuredProfile, setStructuredProfile] = useState<StructuredProfile | null>(null)
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [generatingProfile, setGeneratingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        sessionId,
        sessionName,
      },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const canSend = Boolean(sessionId && input.trim() && !isLoading)

  const placeholder = useMemo(() => {
    if (!sessionId) return '请先从会话列表选择一个会话'
    return `询问「${sessionName}」的聊天内容`
  }, [sessionId, sessionName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!sessionId) {
      void Promise.resolve().then(() => {
        setProfile('')
        setStructuredProfile(null)
        setProfileUpdatedAt(null)
      })
      return
    }

    void Promise.resolve().then(() => {
      setLoadingProfile(true)
      setProfileError('')
      fetch(`/api/profile?talker=${encodeURIComponent(sessionId)}`)
        .then(async response => {
          const data = await response.json() as ProfileResponse
          if (!response.ok || !data.success) {
            throw new Error(data.error || '读取画像失败')
          }
          setProfile(data.profile?.content ?? '')
          setStructuredProfile(data.profile?.structured ?? null)
          setProfileUpdatedAt(data.profile?.updatedAt ?? null)
        })
        .catch(error => {
          setProfile('')
          setStructuredProfile(null)
          setProfileUpdatedAt(null)
          setProfileError(error instanceof Error ? error.message : '读取画像失败')
        })
        .finally(() => setLoadingProfile(false))
      })
  }, [sessionId])

  function submit(text: string) {
    if (!sessionId || !text.trim() || isLoading) return

    sendMessage({ text: text.trim() })
    setInput('')
  }

  async function generateProfile() {
    if (!sessionId || generatingProfile) return

    setGeneratingProfile(true)
    setProfileError('')
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talker: sessionId,
          displayName: sessionName,
        }),
      })
      const data = await response.json() as ProfileResponse

      if (!response.ok || !data.success) {
        throw new Error(data.error || '生成画像失败')
      }

      setProfile(data.profile?.content ?? '')
      setStructuredProfile(data.profile?.structured ?? null)
      setProfileUpdatedAt(data.profile?.updatedAt ?? null)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : '生成画像失败')
    } finally {
      setGeneratingProfile(false)
    }
  }

  return (
    <main className="flex h-svh bg-background">
      <aside className="hidden w-[420px] shrink-0 flex-col border-r lg:flex">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserRound className="size-4" />
              人物画像
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {profileUpdatedAt ? `更新于 ${new Date(profileUpdatedAt).toLocaleString('zh-CN')}` : '暂无已保存画像'}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!sessionId || generatingProfile}
            onClick={generateProfile}
          >
            {generatingProfile ? '分析中' : profile ? '重新分析' : '生成画像'}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {loadingProfile ? (
              <div className="text-sm text-muted-foreground">正在读取画像...</div>
            ) : profileError ? (
              <div className="text-sm text-destructive">{profileError}</div>
            ) : structuredProfile ? (
              <div className="space-y-5">
                <section className="space-y-2">
                  <h2 className="text-base font-semibold tracking-normal">{structuredProfile.displayName}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{structuredProfile.summary}</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium">基本信息</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {structuredProfile.basicInfo.filter(isKnownBasicInfo).map(field => (
                      <div
                        key={field.key}
                        className={`min-w-0 rounded-md border px-2.5 py-2 ${
                          isLongBasicInfo(field) ? 'col-span-2' : ''
                        }`}
                        title={[
                          field.evidence ? `证据：${field.evidence}` : '',
                          `可信度：${field.confidence}`,
                        ].filter(Boolean).join('\n')}
                      >
                        <div className="truncate text-[11px] text-muted-foreground">{field.label}</div>
                        <div className="mt-0.5 line-clamp-3 break-words text-sm font-medium leading-5">
                          {field.value}
                        </div>
                      </div>
                    ))}
                    {structuredProfile.basicInfo.filter(isKnownBasicInfo).length === 0 && (
                      <div className="col-span-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        暂无可确认的基本信息。
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium">深度分析</h3>
                  <Markdown content={structuredProfile.analysisMarkdown} />
                </section>
              </div>
            ) : profile ? (
              <Markdown content={profile} />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                当前会话还没有画像文件。点击“生成画像”后会读取全部历史消息并保存到 resources。
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <Button asChild variant="outline" size="icon" title="返回">
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-medium">{sessionName}</h1>
            <div className="truncate text-xs text-muted-foreground">{sessionId || '没有选择会话'}</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!sessionId || generatingProfile}
            onClick={generateProfile}
            title="生成画像"
            className="lg:hidden"
          >
            <RefreshCw className={`size-4 ${generatingProfile ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {sessionId ? '输入问题后开始分析这个会话。' : '从首页选择一个会话后再开始。'}
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {getMessageText(message)}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-sm text-destructive">{error.message}</div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <form
          className="shrink-0 border-t px-4 py-3"
          onSubmit={event => {
            event.preventDefault()
            submit(input)
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl gap-2">
            <Textarea
              value={input}
              disabled={!sessionId}
              onChange={event => setInput(event.target.value)}
              placeholder={placeholder}
              className="min-h-11 resize-none text-sm"
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit(input)
                }
              }}
            />
            <Button type="submit" size="icon" disabled={!canSend} title="发送" className="self-end">
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm text-muted-foreground">正在加载...</main>}>
      <ChatContent />
    </Suspense>
  )
}
