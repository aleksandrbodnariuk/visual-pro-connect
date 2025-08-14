
import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import { useSupabaseAuth } from '@/hooks/auth/useSupabaseAuth';

export function NavbarActions() {
  const { getCurrentUser } = useSupabaseAuth();
  const currentUser = getCurrentUser();

  return (
    <div className="flex items-center gap-2">
      <LanguageSelector />
      <UserMenu currentUser={currentUser} />
    </div>
  );
}
