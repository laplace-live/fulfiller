import { Cron } from 'croner'

import type { RouzaoOrders } from './types'

async function fetchRouzaoOrders() {
  const API_URL = 'https://api.rouzao.com/talent/order?page=1&page_size=30'
  const rouzaoToken = process.env['ROUZAO_TOKEN']

  if (!rouzaoToken) {
    throw new Error('ROUZAO_TOKEN is not set')
  }

  try {
    console.log(`[${new Date().toISOString()}] Fetching orders...`)

    const headers: RequestInit['headers'] = {
      'Rouzao-Token': rouzaoToken,
      'Rouzao-Web-Ver': '1',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'Referer': 'https://www.rouzao.com/',
      'Origin': 'https://www.rouzao.com',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    }

    const resp = await fetch(API_URL, {
      headers,
    })

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`)
    }

    const json: RouzaoOrders = await resp.json()
    console.log(`[${new Date().toISOString()}] Successfully fetched orders:`, json)

    return json
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error)
  }
}

// Create cron job to run every 5 minutes
const job = new Cron('*/5 * * * *', async () => {
  await fetchRouzaoOrders()
})

console.log('Cron job started - fetching orders every 5 minutes')
console.log(`Next run scheduled at: ${job.nextRun()}`)

// Fetch immediately on startup
fetchRouzaoOrders()
