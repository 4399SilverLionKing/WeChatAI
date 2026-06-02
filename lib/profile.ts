import fs from 'node:fs/promises'
import path from 'node:path'
import type { Message } from '@/lib/weflow'

const RESOURCES_DIR = path.join(process.cwd(), 'resources')
const PROFILE_JSON_FILE = 'profile.json'
const MESSAGES_FILE = 'messages.json'
const METADATA_FILE = 'metadata.json'

export type BasicProfileField = {
  key: string
  label: string
  value: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  evidence?: string
}

export type StructuredProfile = {
  schemaVersion: 1
  displayName: string
  talker: string
  generatedAt: string
  summary: string
  basicInfo: BasicProfileField[]
  analysisMarkdown: string
}

function safeTalkerName(talker: string) {
  return talker.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
}

export function getTalkerResourceDir(talker: string) {
  return path.join(RESOURCES_DIR, safeTalkerName(talker))
}

export function getProfilePath(talker: string) {
  return path.join(getTalkerResourceDir(talker), PROFILE_JSON_FILE)
}

export async function hasProfile(talker: string) {
  try {
    await fs.access(getProfilePath(talker))
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return false
    throw error
  }
}

export async function readProfile(talker: string) {
  const filePath = getProfilePath(talker)

  try {
    const [raw, stat] = await Promise.all([
      fs.readFile(filePath, 'utf8'),
      fs.stat(filePath),
    ])
    const structured = JSON.parse(raw) as StructuredProfile

    return {
      exists: true,
      content: structured.analysisMarkdown,
      structured,
      updatedAt: stat.mtime.toISOString(),
      path: filePath,
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return {
        exists: false,
        content: '',
        structured: null,
        updatedAt: null,
        path: filePath,
      }
    }

    throw error
  }
}

export async function saveProfile({
  talker,
  profile,
  messages,
  metadata,
}: {
  talker: string
  profile: StructuredProfile
  messages: Message[]
  metadata: Record<string, unknown>
}) {
  const dir = getTalkerResourceDir(talker)
  await fs.mkdir(dir, { recursive: true })

  await Promise.all([
    fs.writeFile(path.join(dir, PROFILE_JSON_FILE), JSON.stringify(profile, null, 2), 'utf8'),
    fs.writeFile(path.join(dir, MESSAGES_FILE), JSON.stringify(messages, null, 2), 'utf8'),
    fs.writeFile(path.join(dir, METADATA_FILE), JSON.stringify(metadata, null, 2), 'utf8'),
  ])

  return readProfile(talker)
}
