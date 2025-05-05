
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusSquare } from "lucide-react";

interface CreatePostButtonProps {
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function CreatePostButton({ onClick, variant = "default", className = "" }: CreatePostButtonProps) {
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
