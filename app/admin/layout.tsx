import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default async function AdminLayout({ children }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'platform_admin') {
    redirect('/app')
  }

  return <>{children}</>
}
