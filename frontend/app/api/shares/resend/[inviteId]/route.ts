import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendShareInviteEmail } from '@/lib/email/resend';
import { ConvexHttpClient } from "convex/browser";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteId } = await params;

    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Resend invitation
    const result = await convexClient.mutation('shares:resendInvite' as any, {
      ownerId: userId,
      inviteId: inviteId as any,
    });

    // Get user info
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const ownerName = user?.firstName || user?.username || 'A user';
    const primaryEmailId = user?.primaryEmailAddressId;
    const ownerEmail =
      user?.emailAddresses?.find((address) => address.id === primaryEmailId)?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      '';

    return NextResponse.json({
      success: true,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[API] Failed to resend invitation:', error);
    return NextResponse.json(
      {
        error: 'Failed to resend invitation',
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
