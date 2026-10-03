import { redirect } from 'next/navigation';
import { BookOpen, CalendarDays, Cloud, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import LoginForm from './login-form';
import './login.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = !!getSupabaseConfig();
  if (configured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/');
  }
  const params = await searchParams;
  return <main className="auth-page">
    <section className="auth-story">
      <a className="brand" href="/"><span className="brand-icon"><BookOpen size={23} /></span>wordnest<span className="brand-dot">.</span></a>
      <div className="auth-story-body">
        <p className="auth-eyebrow">GÓC HỌC TIẾNG ANH CỦA BẠN</p>
        <h1>Mỗi ngày một chút,<br />nhớ thêm nhiều từ.</h1>
        <p>Mang theo bộ từ vựng của bạn, dù học trên máy tính hay điện thoại.</p>
        <ul className="auth-benefits">
          <li><BookOpen size={20} /><span>Dán bảng từ ChatGPT, lưu đủ nghĩa và ví dụ.</span></li>
          <li><CalendarDays size={20} /><span>Ôn lại từ đã thêm theo từng tuần.</span></li>
          <li><Sparkles size={20} /><span>Ghi nhớ nhẹ nhàng qua thẻ học và trò chơi.</span></li>
          <li><Cloud size={20} /><span>Từ vựng và tiến độ đi cùng tài khoản của bạn.</span></li>
        </ul>
      </div>
      <p className="auth-story-foot">Một chiếc tổ nhỏ cho những từ mới.</p>
    </section>
    <section className="auth-form-side">
      <div className="auth-card">
        <LoginForm configured={configured} confirmationError={params.error === 'confirmation'} />
      </div>
      <p className="auth-privacy">Bộ từ vựng được lưu riêng theo tài khoản Wordnest.</p>
    </section>
  </main>;
}
