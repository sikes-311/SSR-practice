import { redirect } from 'next/navigation';
import { requireSession, UnauthorizedError } from '@/lib/session';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await requireSession();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect('/login');
    }
    throw e;
  }

  return <>{children}</>;
}
