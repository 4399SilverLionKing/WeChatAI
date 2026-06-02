'use client'

import { Search, RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Session } from '@/lib/weflow'

type SessionsResponse = {
  success: boolean
  count: number
  sessions: Session[]
  error?: string
}

type HealthResponse = {
  success: boolean
  status: string
  error?: string
}

function formatTime(timestamp: number) {
  if (!timestamp) return '暂无时间'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

export default function HomePage() {
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<HealthResponse | null>(null)

  const loadSessions = useCallback(async (nextQuery: string) => {
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (nextQuery.trim()) {
      params.set('keyword', nextQuery.trim())
    }

    try {
      const res = await fetch(`/api/sessions?${params.toString()}`)
      const data = await res.json() as SessionsResponse

      if (!res.ok || !data.success) {
        throw new Error(data.error || '获取会话列表失败')
      }

      setSessions(data.sessions)
    } catch (err) {
      setSessions([])
      setError(err instanceof Error ? err.message : '获取会话列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/weflow/health')
      const data = await res.json() as HealthResponse
      setHealth(data)
    } catch {
      setHealth({ success: false, status: 'error', error: '无法连接 WeFlow' })
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      checkHealth()
      loadSessions('')
    })
  }, [checkHealth, loadSessions])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(keyword)
    loadSessions(keyword)
  }

  function refresh() {
    checkHealth()
    loadSessions(query)
  }

  const connected = Boolean(health?.success)

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-5 py-5">
        <header className="flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal">微信会话索引</h1>
                <Badge variant={connected ? 'secondary' : 'destructive'} className="gap-1">
                  {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                  {connected ? 'WeFlow 已连接' : 'WeFlow 未连接'}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {loading ? '正在同步会话...' : `共 ${sessions.length} 个会话`}
                {query && !loading ? `，筛选：${query}` : ''}
              </div>
            </div>

            <Button type="button" variant="outline" size="icon" onClick={refresh} disabled={loading} title="刷新">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <form onSubmit={submitSearch} className="flex w-full gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <input
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="搜索名称或 username"
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-9 text-sm outline-none focus-visible:ring-2"
              />
            </div>
            <Button type="submit" disabled={loading}>
              查询
            </Button>
          </form>
        </header>

        <section className="min-h-0 flex-1 pt-4">
          <ScrollArea className="h-[calc(100svh-132px)] min-h-[360px] rounded-md border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">正在读取 WeFlow 会话列表...</div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">没有找到匹配的会话。</div>
            ) : (
              <div className="divide-y">
                {sessions.map(session => (
                  <Link
                    key={session.username}
                    href={`/chat?session=${encodeURIComponent(session.username)}&name=${encodeURIComponent(session.displayName || '')}`}
                    prefetch={false}
                    className="grid gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_150px] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{session.displayName || '未命名会话'}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{session.username}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground md:justify-end">
                      <Clock className="size-3.5" />
                      <span>{formatTime(session.lastTimestamp)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </section>
      </div>
    </main>
  )
}
