 

interface YouTubeApiResult {
  success: boolean
  subscriberCount?: number
  error?: string
}

export async function getYouTubeSubscriberCount(channelId: string): Promise<YouTubeApiResult> {
  const API_KEY = 'AIzaSyCt6LmhEqwywbjyn_NASijDDfK-Cr5sTsg'
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
    }

    const data : any= await response.json()
    
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: 'Channel not found'
      }
    }

    const subscriberCount = parseInt(data.items[0].statistics.subscriberCount, 10)
    
    return {
      success: true,
      subscriberCount
    }
  } catch (error) {
    console.error('YouTube API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subscriber count'
    }
  }
}

// Function to get channel ID from channel URL or handle
export function extractChannelId(channelUrl: string): string | null {
  // Handle different YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/
  ]
  
  for (const pattern of patterns) {
    const match = channelUrl.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  // If it's already a channel ID
  if (/^[a-zA-Z0-9_-]{24}$/.test(channelUrl)) {
    return channelUrl
  }
  
  return null
}
