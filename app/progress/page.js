'use client';
import dynamic from 'next/dynamic';

const ProgressContent = dynamic(() => import('./ProgressContent'), { 
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <div className="spinner" style={{ width: 48, height: 48 }}></div>
    </div>
  )
});

export default function ProgressPage() {
  return <ProgressContent />;
}
