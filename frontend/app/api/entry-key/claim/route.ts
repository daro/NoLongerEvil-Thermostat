import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { claimConvexEntryKey, ensureConvexUser } from '@/lib/server/convex';

export async function POST(request: NextRequest) {
  try {
    let { userId } = await auth();
    let email: string | undefined;

    if (!userId) {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
      email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        undefined;
    } else {
      const user = await currentUser();
      email =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        undefined;
    }

    const body = await request.json().catch(() => null);
    const code: string | undefined = body?.code;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Entry key is required' }, { status: 400 });
    }

    const normalizedCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (normalizedCode.length !== 7) {
      return NextResponse.json({ error: 'Entry key must be 7 alphanumeric characters' }, { status: 400 });
    }

    await ensureConvexUser(userId, email ?? '');

    const result = await claimConvexEntryKey(normalizedCode, userId);

    // Notify the thermostat about the updated state so it knows it's been paired
    if (result?.serial) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
        const userIdShort = userId.replace(/^user_/, '');
        const userKey = `user.${userIdShort}`;
        const deviceKey = `device.${result.serial}`;
        const structureKey = `structure.${userIdShort}`;
        const linkKey = `link.${result.serial}`;
        const alertDialogKey = `device_alert_dialog.${result.serial}`;

        // Notify the server to push all pairing-related state objects to the device
        // The server will load the full objects (with values, revision, timestamp) from Convex
        // and send them to the device if it's subscribed
        await fetch(`${apiUrl}/notify-device`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial: result.serial,
            objectKeys: [userKey, deviceKey, structureKey, linkKey, alertDialogKey]
          })
        }).catch(err => {
          console.error('[API] Failed to notify device about pairing:', err.message);
        });
      } catch (notifyErr) {
        console.error('[API] Failed to notify device:', notifyErr);
        // Don't fail the claim if notification fails
      }
    }

    return NextResponse.json({ success: true, serial: result?.serial });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Failed to claim entry key:', message);
    return NextResponse.json(
      {
        error: 'Failed to claim entry key',
        message,
      },
      { status: 400 }
    );
  }
}
