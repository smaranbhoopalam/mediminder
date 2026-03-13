'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          router.push('/dashboard');
        } else {
          router.push('/register');
        }
      } else {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      minHeight: '100vh', position: 'relative', zIndex: 1 
    }}>
      <div className="spinner" style={{ width: 48, height: 48 }}></div>
    </div>
  );
}
