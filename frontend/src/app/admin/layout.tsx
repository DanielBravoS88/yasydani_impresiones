import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = { title: 'Panel Admin | Yas&Dani' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,nombre,apellido')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'administrador') {
    redirect('/?acceso=denegado');
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#fdf4ff' }}>
      <AdminSidebar adminName={`${profile.nombre} ${profile.apellido}`.trim()} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
