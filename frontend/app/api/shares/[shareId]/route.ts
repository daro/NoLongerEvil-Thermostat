import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";

// DELETE - Revoke share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shareId } = await params;

    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    await convexClient.mutation('shares:revokeShare' as any, {
      ownerId: userId,
      shareId: shareId as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to revoke share:', error);
    return NextResponse.json(
      {
        error: 'Failed to revoke share',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update permissions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shareId } = await params;
    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Missing required field: permissions' },
        { status: 400 }
      );
    }

    const convexClient = await getClient();
    if (!convexClient) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    await convexClient.mutation('shares:updateSharePermissions' as any, {
      ownerId: userId,
      shareId: shareId as any,
      permissions,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update permissions:', error);
    return NextResponse.json(
      {
        error: 'Failed to update permissions',
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
