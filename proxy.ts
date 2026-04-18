import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth';

const SESSION_NAME = 'adimology_session';
const EXTENSION_SYNC_PATH = '/api/update-token';

// Define paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/verify-password',
  '/api/auth/check-password',
  '/api/auth/set-password', // Allow initial setup
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow background jobs/cron via secret token
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return NextResponse.next();
  }

  // 1b. Allow extension token sync via dedicated shared secret header
  const extensionSyncKey = process.env.EXTENSION_SYNC_KEY;
  const requestSyncKey = request.headers.get('x-extension-key');
  if (
    pathname === EXTENSION_SYNC_PATH &&
    extensionSyncKey &&
    requestSyncKey === extensionSyncKey
  ) {
    return NextResponse.next();
  }

  // 2. Only protect API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow public auth routes
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: No session' },
      { status: 401 }
    );
  }

  // Verify token
  const session = await verifySessionToken(sessionCookie);
  if (!session) {
    const response = NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid session' },
      { status: 401 }
    );

    response.cookies.delete(SESSION_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
