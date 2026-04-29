import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
        set: (key, value, options) => {
          res.cookies.set(key, value, options)
        },
        remove: (key, options) => {
          res.cookies.set(key, '', options)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🔒 BLOQUEIO REAL
  if (!user && req.nextUrl.pathname.startsWith('/app')) {
   return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
  }

  return res
}

// Define onde o middleware atua
export const config = {
  matcher: ['/app/:path*'],
}
