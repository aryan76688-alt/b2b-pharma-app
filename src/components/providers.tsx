'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          return json.data.user;
        }
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isAuthPage =
      pathname === '/login' ||
            pathname === '/forgot-password';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user) {
      // Role isolation
      if (user.role === 'salesman' && pathname.startsWith('/owner')) {
        router.push('/salesman/dashboard');
      } else if ((user.role === 'owner' || user.role === 'super_admin') && pathname.startsWith('/salesman')) {
        router.push('/owner/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = (token: string, userData: User) => {
    setUser(userData);
    if (userData.role === 'owner' || userData.role === 'super_admin') {
      router.push('/owner/dashboard');
    } else {
      router.push('/salesman/dashboard');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      queryClient.clear();
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await fetchSession();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
