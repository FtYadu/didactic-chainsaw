import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'edge';
export const maxDuration = 60; // Image generation can take longer

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit - more restrictive for image generation
    const rateLimitResult = await checkRateLimit(`image:${ip}`, 'free');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { prompt, size = '1024x1024', quality = 'standard' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
      quality: quality as 'standard' | 'hd',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned');
    }

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    return NextResponse.json(
      {
        imageUrl,
        revisedPrompt,
        prompt,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Image generation error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Image generation failed',
      },
      { status: 500 }
    );
  }
}
