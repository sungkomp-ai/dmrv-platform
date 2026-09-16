export { default } from 'next-auth/middleware';

export const config = {
  // Protect all routes except: login page, NextAuth API, static assets, public APIs
  matcher: [
    '/((?!login|api/auth|api/dmrv/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.pdf$|.*\\.html$).*)',
  ],
};
