'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, setStoredUser, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@bomsabor.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/auth/login', { email, password });
      setToken(r.data.accessToken);
      setStoredUser(r.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Lado esquerdo - editorial */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900 text-ink-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-60" />
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-clay-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-moss-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo variant="light" size="lg" href="" />

          <div className="space-y-8">
            <p className="text-xs uppercase tracking-[0.2em] text-clay-300">
              Plataforma de logística
            </p>
            <h1 className="display text-6xl leading-[0.95] text-ink-50">
              Um entregador<br />
              <em className="text-clay-400 not-italic">à distância de</em><br />
              um clique.
            </h1>
            <p className="text-ink-300 max-w-sm leading-relaxed">
              Lance pedidos, acompanhe a rota em tempo real e pague no fim do mês.
              Nada de cardápio, nada de marketplace — só logística que funciona.
            </p>
          </div>

          <div className="flex gap-8 text-xs text-ink-400 tabular">
            <div>
              <div className="text-2xl display text-ink-50">14k+</div>
              <div>entregas/mês</div>
            </div>
            <div>
              <div className="text-2xl display text-ink-50">98,4%</div>
              <div>SLA cumprido</div>
            </div>
            <div>
              <div className="text-2xl display text-ink-50">4 min</div>
              <div>tempo médio de match</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-12">
            <Logo />
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.18em] text-clay-600 font-medium mb-3">
              Bem-vindo de volta
            </p>
            <h2 className="display text-4xl text-ink-900 leading-tight">
              Entre na sua conta
            </h2>
            <p className="text-sm text-ink-500 mt-2">
              Acesse seu painel de operações
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="p-3 rounded-lg bg-clay-50 border border-clay-200 text-sm text-clay-800">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-200">
            <p className="text-xs text-ink-400">
              Conta de demonstração:<br />
              <span className="font-mono text-ink-600">demo@bomsabor.com</span> /{' '}
              <span className="font-mono text-ink-600">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
