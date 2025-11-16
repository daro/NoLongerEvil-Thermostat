import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureConvexUser } from '@/lib/server/convex';
import { sendShareInviteEmail } from '@/lib/email/resend';
import { ConvexHttpClient } from "convex/browser";

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmailId = user?.primaryEmailAddressId;
    const ownerEmail =
      user?.emailAddresses?.find((address) => address.id === primaryEmailId)?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      '';
    const ownerName = user?.firstName || user?.username || 'A user';

    if (!ownerEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    await ensureConvexUser(userId, ownerEmail);

    const body = await request.json();
    const { email, serial, permissions } = body;

    if (!email || !serial || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Missing required fields: email, serial, permissions' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate permissions
    const validPermissions = ['view', 'control'];
    const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPerms.join(', ')}` },
        { status: 400 }
      );
    }

    // Must have at least "view" permission
    if (!permissions.includes('view')) {
      permissions.push('view');
    }

    // Create invitation in Convex
    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const result = await convexClient.mutation('shares:createShareInvite' as any, {
      ownerId: userId,
      email: email.toLowerCase(),
      serial,
      permissions,
    });

    // Get device name
    const deviceState = await convexClient.query('device:getDeviceState' as any, { serial });
    const sharedState = deviceState?.[`shared.${serial}`]?.value || {};
    const deviceData = deviceState?.[`device.${serial}`]?.value || {};
    const deviceName = sharedState.name || deviceData.where_id || serial;

    // Send email
    const acceptUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/shares/accept/${result.inviteToken}`;
    const emailResult = await sendShareInviteEmail({
      to: email,
      ownerName,
      ownerEmail,
      deviceName,
      permissions,
      acceptUrl,
      expiresInDays: 7,
    });

    if (!emailResult.success) {
      console.error('[API] Failed to send invitation email:', emailResult.error);
      // Don't fail the request - invitation is created
    }

    return NextResponse.json({
      success: true,
      inviteId: result.inviteId,
      expiresAt: result.expiresAt,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('[API] Failed to create share invitation:', error);
    return NextResponse.json(
      {
        error: 'Failed to create invitation',
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
