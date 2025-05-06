
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusSquare } from "lucide-react";

interface CreatePostButtonProps {
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function CreatePostButton({ onClick, variant = "default", className = "" }: CreatePostButtonProps) {
  // This component is now only used on the profile page
  return (
    <Button 
      variant={variant} 
      size="sm" 
      onClick={onClick}
      className={className}
    >
      <PlusSquare className="mr-2 h-4 w-4" /> Створити публікацію
    </Button>
  );
}
