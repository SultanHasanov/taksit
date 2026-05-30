import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Segmented, message } from 'antd';
import { signIn } from '../firebase/auth';

const DEMO = {
  admin:    { email: 'admin@taksit.ru',    password: 'demo1234' },
  investor: { email: 'investor@taksit.ru', password: 'demo1234' },
  client:   { email: 'client@taksit.ru',   password: 'demo1234' },
};

export default function Login() {
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('admin');

  const handleRoleChange = (val) => {
    setRole(val);
    const demo = DEMO[val];
    form.setFieldsValue({ email: demo.email, password: demo.password });
  };

  const handleSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      await signIn(email, password);
      nav('/', { replace: true }); // index route → RoleRedirect routes by role
    } catch (e) {
      message.error('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      padding: '36px 24px 40px', maxWidth: 480, margin: '0 auto',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 62, height: 62, borderRadius: 18, display: 'grid', placeItems: 'center',
          border: '1px solid var(--line-gold)',
          background: 'linear-gradient(160deg, var(--gold-soft), transparent)',
        }}>
          <div style={{
            width: 21, height: 21, background: 'linear-gradient(150deg,#E6CD8C,#8C6F30)',
            transform: 'rotate(45deg)', borderRadius: 4, boxShadow: '0 0 14px rgba(203,164,90,.6)',
          }} />
        </div>
        <div>
          <div className="h-title" style={{ fontSize: 28, letterSpacing: '.16em' }}>
            TAK<span style={{ color: 'var(--gold)' }}>SIT</span>
          </div>
          <div className="faint" style={{ fontSize: 12.5, marginTop: 6, letterSpacing: '.04em' }}>
            Частное финансирование рассрочки
          </div>
        </div>
      </div>

      {/* Role selector */}
      <div className="eyebrow" style={{ marginBottom: 11 }}>Войти как</div>
      <Segmented
        options={[
          { label: 'Админ',    value: 'admin' },
          { label: 'Инвестор', value: 'investor' },
          { label: 'Клиент',   value: 'client' },
        ]}
        value={role}
        onChange={handleRoleChange}
        block
        style={{ marginBottom: 24, fontWeight: 600 }}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}
        initialValues={{ email: DEMO.admin.email, password: DEMO.admin.password }}>
        <Form.Item label="Эл. почта" name="email"
          rules={[{ required: true, message: 'Введите email' }]}>
          <Input size="large" placeholder="email@example.com" />
        </Form.Item>
        <Form.Item label="Пароль" name="password"
          rules={[{ required: true, message: 'Введите пароль' }]}>
          <Input.Password size="large" placeholder="············" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginBottom: 20 }}>
          <span style={{ color: 'var(--gold-lite)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Забыли пароль?
          </span>
        </div>

        <Button type="primary" htmlType="submit" size="large" block loading={loading}
          style={{
            background: 'linear-gradient(145deg,#E6CD8C,#CBA45A)', border: 'none',
            color: '#2A2008', fontWeight: 600, height: 52, fontSize: 15,
            boxShadow: '0 12px 30px -10px rgba(203,164,90,.5)',
          }}>
          Войти · {role === 'admin' ? 'Админ' : role === 'investor' ? 'Инвестор' : 'Клиент'} →
        </Button>
      </Form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="faint" style={{ fontSize: 10.5, letterSpacing: '.1em' }}>ЗАЩИЩЁННЫЙ ВХОД</span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <div className="faint" style={{ textAlign: 'center', fontSize: 11, lineHeight: 1.7 }}>
        Банковское шифрование · Вход по биометрии<br/>Лицензированный оператор рассрочки
      </div>
    </div>
  );
}
