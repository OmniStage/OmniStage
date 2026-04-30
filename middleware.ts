import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // 🔐 cria cliente Supabase no server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 👤 pega usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🚫 bloqueia acesso às áreas internas sem login
  if (!user) {
    return NextResponse.redirect(
      new URL('/login', req.nextUrl.origin)
    )
  }

  return res
}

// 🎯 define rotas protegidas
export const config = {
  matcher: ['/dashboard/:path*', '/invites/:path*', '/checkin/:path*'],
}
