import { getSessions } from '@/lib/weflow'

function shouldKeepSession(username: string) {
  return (
    username !== 'filehelper' &&
    username !== 'mphelper' &&
    !username.startsWith('gh_') &&
    !username.includes('@')
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword') ?? undefined
  const limitParam = searchParams.get('limit')
  const parsedLimit = limitParam ? Number(limitParam) : undefined
  const limit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.floor(parsedLimit)
    : 1000000

  try {
    const sessions = (await getSessions(keyword, limit)).filter(
      session => shouldKeepSession(session.username)
    )
    return Response.json({
      success: true,
      count: sessions.length,
      sessions,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        count: 0,
        sessions: [],
        error: error instanceof Error ? error.message : 'Failed to fetch WeFlow sessions',
      },
      { status: 502 }
    )
  }
}
