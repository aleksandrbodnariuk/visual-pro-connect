
import React from 'react';
import { LanguageSelector } from './LanguageSelector';

export function NavbarActions() {
  return (
    <div className="flex items-center gap-2">
      <LanguageSelector />
    </div>
  );
}
