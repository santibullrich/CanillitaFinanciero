import { redirect } from 'next/navigation';
import Portfolio from '@/components/Portfolio';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi cartera · CanillitaFinanciero' };

export default async function Cartera({ searchParams }: { searchParams: { agregar?: string } }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect(`/ingresar?volver=${encodeURIComponent('/cartera' + (searchParams.agregar ? `?agregar=${searchParams.agregar}` : ''))}`);
  const nombre = (user.user_metadata?.nombre as string) || user.email?.split('@')[0] || 'vos';
  return <Portfolio userId={user.id} nombre={nombre} preset={searchParams.agregar} />;
}
