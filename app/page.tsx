import VocabularyApp from './vocabulary-app';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!getSupabaseConfig()) redirect('/login');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return <VocabularyApp userEmail={user.email || ''} />;
}
