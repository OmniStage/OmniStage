import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default async function AppLayout({ children }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/criar-empresa')
  }

  return <>{children}</>
}
