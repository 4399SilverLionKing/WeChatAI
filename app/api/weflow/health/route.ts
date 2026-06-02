import { getHealth } from '@/lib/weflow'

export async function GET() {
  try {
    const health = await getHealth()
    return Response.json({
      success: true,
      status: health.status,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to connect to WeFlow',
      },
      { status: 502 }
    )
  }
}
