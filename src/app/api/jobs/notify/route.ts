import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_URL is not defined in environment variables.')
    return NextResponse.json(
      { message: 'Webhook URL not configured' },
      { status: 500 }
    )
  }

  try {
    const jobData = await request.json()

    // By awaiting the fetch, we ensure the serverless function doesn't terminate before the request is sent.
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    })

    // Log the response from the webhook for debugging purposes.
    console.log(`Webhook response status: ${webhookResponse.status}`)

    if (!webhookResponse.ok) {
      console.error('Webhook returned an error:', await webhookResponse.text())
    }

    return NextResponse.json({ message: 'Webhook triggered' }, { status: 202 })
  } catch (error) {
    console.error('Error processing webhook trigger:', error)
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }
}