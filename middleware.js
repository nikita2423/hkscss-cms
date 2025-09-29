import { NextResponse } from 'next/server';

const ALLOW = new Set(['http://localhost:3000']); // allowed caller(s)

export function middleware(req) {
  const origin = req.headers.get('origin') ?? '';
  const isAllowed = ALLOW.has(origin);
  const url = new URL(req.url);

  // Only affect API routes
  if (!url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Preflight request
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (isAllowed) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set(
        'Access-Control-Allow-Headers',
        req.headers.get('access-control-request-headers') || 'Content-Type, Authorization'
      );
      res.headers.set(
        'Access-Control-Allow-Methods',
        req.headers.get('access-control-request-method') || 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      );
      res.headers.set('Access-Control-Max-Age', '86400');
      // Uncomment if you need cookies/auth across origins
      // res.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return res;
  }

  // Normal request
  const res = NextResponse.next();
  if (isAllowed) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    // Uncomment if you need cookies/auth
    // res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'] // only run middleware on API routes
};
