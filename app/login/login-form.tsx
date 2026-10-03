'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function errorMessage(code?: string) {
  if (code === 'invalid_credentials') return 'Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.';
  if (code === 'email_not_confirmed') return 'Bạn cần mở email xác nhận tài khoản trước khi đăng nhập. Hãy kiểm tra cả thư rác.';
  if (code === 'user_already_exists') return 'Email này đã có tài khoản. Bạn hãy chuyển sang Đăng nhập.';
  if (code === 'weak_password') return 'Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự, gồm chữ và số.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
  if (code === 'email_address_invalid') return 'Địa chỉ email chưa hợp lệ. Bạn kiểm tra lại nhé.';
  if (code === 'email_address_not_authorized') return 'Dịch vụ gửi email chưa được mở cho địa chỉ này. Chủ trang cần hoàn tất cấu hình gửi email.';
  if (code === 'signup_disabled') return 'Trang hiện chưa mở đăng ký tài khoản mới.';
  return 'Chưa thể kết nối tài khoản. Bạn kiểm tra mạng rồi thử lại nhé.';
}

export default function LoginForm({ configured, confirmationError }: { configured: boolean; confirmationError: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(confirmationError ? 'Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Bạn thử đăng nhập; nếu chưa xác nhận được, hãy gửi lại email bên dưới.' : '');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setError(''); setMessage(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    try {
      const client = createClient();
      if (mode === 'signup') {
        if (password !== String(form.get('confirmPassword') || '')) { setError('Hai mật khẩu chưa trùng nhau.'); return; }
        const { data, error } = await client.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) { setError(errorMessage(error.code)); return; }
        if (!data.session) {
          setMessage('Hãy mở email xác nhận từ Wordnest / Supabase, bấm liên kết trong thư rồi quay lại đăng nhập. Nếu đã có tài khoản, bạn có thể đăng nhập ngay.');
          return;
        }
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setError(errorMessage(error.code)); return; }
      }
      window.location.assign('/');
    } catch { setError('Không kết nối được. Bạn kiểm tra mạng rồi thử lại nhé.'); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (busy || !configured) return;
    if (!email.trim()) { setError('Bạn nhập email ở trên trước nhé.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const { error } = await createClient().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } });
      if (error) setError(errorMessage(error.code));
      else setMessage('Nếu tài khoản này đang chờ xác nhận, một email mới đã được gửi. Bạn kiểm tra hộp thư và thư rác nhé.');
    } catch { setError('Chưa gửi được email. Bạn thử lại sau nhé.'); }
    finally { setBusy(false); }
  }

  return <>
    <p className="auth-eyebrow">CHÀO MỪNG ĐẾN WORDNEST</p>
    <h2>{mode === 'login' ? 'Tiếp tục hành trình học.' : 'Tạo góc học của riêng bạn.'}</h2>
    <p className="auth-intro">{mode === 'login' ? 'Đăng nhập để mở bộ từ vựng và tiến độ của bạn.' : 'Tạo tài khoản Wordnest bằng email và mật khẩu bạn chọn.'}</p>
    {!configured ? <div className="auth-message auth-info" role="status"><strong>Wordnest đang được kết nối.</strong><p>Phần đăng nhập chưa sẵn sàng. Bạn quay lại sau khi chủ trang hoàn tất thiết lập nhé.</p></div> : <>
      <div className="auth-tabs" aria-label="Chọn đăng nhập hoặc đăng ký">
        <button type="button" className={mode === 'login' ? 'selected' : ''} disabled={busy} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Đăng nhập</button>
        <button type="button" className={mode === 'signup' ? 'selected' : ''} disabled={busy} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Tạo tài khoản</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="auth-email">Email<input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" disabled={busy} /></label>
        <label htmlFor="auth-password">Mật khẩu<span className="auth-password"><input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 1} maxLength={128} placeholder={mode === 'signup' ? 'Ít nhất 8 ký tự' : 'Mật khẩu của bạn'} disabled={busy} /><button type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {mode === 'signup' && <label htmlFor="auth-confirm">Nhập lại mật khẩu<input id="auth-confirm" name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} /></label>}
        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        {message && <p className="auth-message auth-success" role="status"><Mail size={20} />{message}</p>}
        <button className="primary auth-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Vào góc học' : 'Tạo tài khoản Wordnest'}{!busy && <ArrowRight size={18} />}</button>
      </form>
      {(error || message || mode === 'signup') && <button className="auth-resend" type="button" disabled={busy} onClick={resend}>Gửi lại email xác nhận</button>}
      <p className="auth-account-note">Đây là tài khoản học trên Wordnest, độc lập với tài khoản quản lý Vercel và Supabase.</p>
    </>}
  </>;
}
