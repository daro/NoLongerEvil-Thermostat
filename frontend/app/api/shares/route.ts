import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const serial = request.nextUrl.searchParams.get('serial');

    if (serial) {
      // Get shares for specific device
      const shares = await convexClient.query('shares:getDeviceShares' as any, {
        ownerId: userId,
        serial,
      });

      const invites = await convexClient.query('shares:getDeviceInvites' as any, {
        ownerId: userId,
        serial,
      });

      return NextResponse.json({ shares, invites });
    } else {
      // Get all shares for user
      const sharedWithMe = await convexClient.query('shares:getSharedWithMe' as any, {
        userId,
      });

      return NextResponse.json({ sharedWithMe });
    }
  } catch (error) {
    console.error('[API] Failed to fetch shares:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch shares',
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
