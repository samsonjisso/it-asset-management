'use client';

import { useRouter } from 'next/navigation';
import { DashboardPage } from '@/pages/DashboardPage';

export default function Page() {
  const router = useRouter();
  return <DashboardPage onNavigate={(page: string) => router.push(`/${page}`)} />;
}
