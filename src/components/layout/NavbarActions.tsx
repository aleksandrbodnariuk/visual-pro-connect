
import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import { useAuthState } from '@/hooks/auth/useAuthState';

export function NavbarActions() {
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();

  return (
    <div className="flex items-center gap-2">
      <LanguageSelector />
      <UserMenu currentUser={currentUser} />
    </div>
  );
}
