'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import Image from 'next/image';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'owner') {
        router.replace('/owner/dashboard');
      } else {
        router.replace('/salesman/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F8FC] p-4">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative w-48 h-24">
          <Image
            src="/logo.png"
            alt="Shreeji Healthcare"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="w-8 h-8 border-3 border-shreeji-blue border-t-transparent rounded-full animate-spin mt-2" />
        <p className="text-sm font-medium text-slate-500">Loading Order Book...</p>
      </div>
    </div>
  );
}
