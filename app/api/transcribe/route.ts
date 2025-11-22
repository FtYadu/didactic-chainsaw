import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'edge';
export const maxDuration = 30; // 30 seconds timeout for transcription

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit
    const rateLimitResult = await checkRateLimit(`transcribe:${ip}`, 'standard');

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

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert File to appropriate format for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a new File object with the correct type
    const file = new File([buffer], 'audio.webm', { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Can be made configurable
    });

    return NextResponse.json(
      { text: transcription.text },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Transcription failed',
      },
      { status: 500 }
    );
  }
}
