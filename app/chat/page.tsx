'use client'

import { useChat } from '@ai-sdk/react'
import { ArrowLeft, Send } from 'lucide-react'
import { DefaultChatTransport } from 'ai'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import type { UIMessage } from 'ai'

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text'; text: string }).text)
    .join('')
}

function ChatContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''
  const sessionName = searchParams.get('name') || sessionId || '未选择会话'
  const [input, setInput] = useState('')
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

  function submit(text: string) {
    if (!sessionId || !text.trim() || isLoading) return

    sendMessage({ text: text.trim() })
    setInput('')
  }

  return (
    <main className="flex h-svh flex-col bg-background">
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
