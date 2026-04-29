import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // 🔐 cria cliente Supabase no server
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 👤 pega usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🚫 bloqueia acesso ao /app sem login
  if (!user && req.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(
      new URL('/login', req.nextUrl.origin)
    )
  }

  return res
}

// 🎯 define rotas protegidas
export const config = {
  matcher: ['/app/:path*'],
}
