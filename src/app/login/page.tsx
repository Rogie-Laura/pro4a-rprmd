import { Suspense } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import { DIVISION } from '@/lib/auth/roles';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050912] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(251,191,36,0.16), transparent 25%), radial-gradient(circle at 80% 90%, rgba(59,130,246,0.2), transparent 30%), linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 42px 42px, 42px 42px',
        }}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/90 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden">
            <Image
              src="/PRO4A.png"
              alt="PRO4A Logo"
              width={96}
              height={96}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">{DIVISION.directorate}</h1>
          <p className="mt-1 text-sm text-slate-400">{DIVISION.label}</p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-slate-400">Loading...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 border-t border-slate-700/60 pt-6 text-center">
          <p className="text-sm font-bold tracking-[0.25em] text-amber-400">PROJECT4A</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            <span className="font-medium text-amber-300/90">A</span>ccurate{' '}
            <span className="text-slate-600">·</span>{' '}
            <span className="font-medium text-amber-300/90">A</span>ccessible{' '}
            <span className="text-slate-600">·</span>{' '}
            <span className="font-medium text-amber-300/90">A</span>ctive{' '}
            <span className="text-slate-600">·</span>{' '}
            <span className="font-medium text-amber-300/90">A</span>utomated
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-500">
            Developed by RICTMD4A
          </p>
        </div>
      </div>
    </div>
  );
}
