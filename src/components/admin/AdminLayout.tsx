
import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`w-full ${isMobile ? 'px-2 py-2' : 'px-6 py-4'}`}>
      {children}
    </div>
  );
}

export function AdminGrid({ children }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
      {children}
    </div>
  );
}
