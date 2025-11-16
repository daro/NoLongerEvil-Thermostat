import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureConvexUser } from '@/lib/server/convex';
import { ConvexHttpClient } from "convex/browser";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const result = await convexClient.mutation('shares:acceptShareInvite' as any, {
      token,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Failed to accept invitation:', error);
    return NextResponse.json(
      {
        error: 'Failed to accept invitation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getClient() {
  const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;

  if (!CONVEX_URL) return null;

  const client = new ConvexHttpClient(CONVEX_URL);
  if (CONVEX_ADMIN_KEY) {
    (client as any).setAdminAuth(CONVEX_ADMIN_KEY);
  }
  return client;
}
