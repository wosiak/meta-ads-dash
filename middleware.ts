import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateClientToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Rotas públicas (não precisa auth)
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Área ADMIN
  if (pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get('admin_session')
    
    if (!adminSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return NextResponse.next()
  }

  // Área CLIENTE (token na URL ou cookie)
  const tokenFromUrl = searchParams.get('token')
  const tokenFromCookie = request.cookies.get('client_token')?.value
  
  const token = tokenFromUrl || tokenFromCookie

  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: 'Token de acesso inválido ou ausente' }),
      { 
        status: 401,
        headers: { 'content-type': 'application/json' }
      }
    )
  }

  // Valida token no banco
  const client = await validateClientToken(token)
  
  if (!client) {
    return new NextResponse(
      JSON.stringify({ error: 'Token inválido ou expirado' }),
      { 
        status: 401,
        headers: { 'content-type': 'application/json' }
      }
    )
  }

  // Se token veio da URL, salva em cookie
  if (tokenFromUrl) {
    const response = NextResponse.next()
    response.cookies.set('client_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: 'lax'
    })
    
    // Adiciona informação do cliente ao header (para usar nas páginas)
    response.headers.set('x-client-id', client.id)
    response.headers.set('x-client-name', client.name)
    
    return response
  }

  // Adiciona informação do cliente ao header
  const response = NextResponse.next()
  response.headers.set('x-client-id', client.id)
  response.headers.set('x-client-name', client.name)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
