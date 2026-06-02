#!/usr/bin/env node
// WeFlow API CLI — usage: node weflow.mjs <command> [options]
// Commands: sessions, messages, contacts, group-members
// Env: WEFLOW_BASE_URL (default http://127.0.0.1:5031)

import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [key, ...valueParts] = trimmed.split('=')
    if (!process.env[key]) {
      process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'))

const BASE_URL = process.env.WEFLOW_BASE_URL || 'http://127.0.0.1:5031'
const TOKEN = process.env.WEFLOW_TOKEN || process.env.WEFLOW_ACCESS_TOKEN

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    }
  }
  return args
}

async function weflowFetch(path, params = {}, token) {
  const url = new URL(`/api/v1${path}`, BASE_URL)
  if (token) url.searchParams.set('access_token', token)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WeFlow API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function fetchMessages(talker, opts, token) {
  const limit = Math.max(1, Number(opts.limit || 100))
  const directParams = { talker, limit }
  if (opts.start) directParams.start = opts.start
  if (opts.end) directParams.end = opts.end
  if (opts.keyword) directParams.keyword = opts.keyword

  const direct = await weflowFetch('/messages', directParams, token)
  if (Array.isArray(direct.messages) && direct.messages.length > 0) {
    return direct
  }

  const messages = []
  let offset = 0
  let sync = null

  while (messages.length < limit) {
    const pageLimit = Math.min(5000, limit - messages.length)
    const params = { limit: pageLimit, offset }
    if (opts.start) params.since = opts.start
    if (opts.end) params.end = opts.end

    const page = await weflowFetch(`/sessions/${encodeURIComponent(talker)}/messages`, params, token)
    const pageMessages = Array.isArray(page.messages) ? page.messages : []

    if (pageMessages.length === 0) break

    messages.push(...pageMessages)
    sync = page.sync || null

    if (!page.sync?.hasMore) break

    const nextOffset = Number(page.sync.nextOffset)
    offset = Number.isFinite(nextOffset) && nextOffset > offset
      ? nextOffset
      : offset + pageMessages.length
  }

  return {
    success: true,
    talker,
    count: messages.length,
    hasMore: Boolean(sync?.hasMore),
    sync,
    messages,
  }
}

const [, , command, ...rest] = process.argv
const opts = parseArgs(rest)
const token = opts.token || TOKEN

async function main() {
  if (!command) {
    console.error('Usage: node weflow.mjs <sessions|messages|contacts|group-members> [--option value]')
    process.exit(1)
  }

  let result
  switch (command) {
    case 'sessions': {
      const params = {}
      if (opts.keyword) params.keyword = opts.keyword
      if (opts.limit) params.limit = Number(opts.limit)
      result = await weflowFetch('/sessions', params, token)
      break
    }
    case 'messages': {
      if (!opts.talker) { console.error('--talker is required'); process.exit(1) }
      result = await fetchMessages(opts.talker, opts, token)
      break
    }
    case 'contacts': {
      const params = {}
      if (opts.keyword) params.keyword = opts.keyword
      if (opts.limit) params.limit = Number(opts.limit)
      result = await weflowFetch('/contacts', params, token)
      break
    }
    case 'group-members': {
      if (!opts.chatroom) { console.error('--chatroom is required'); process.exit(1) }
      result = await weflowFetch('/group-members', { chatroomId: opts.chatroom }, token)
      break
    }
    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch(e => { console.error(e.message); process.exit(1) })
