import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  variant = "ghost",
  size = "sm",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={`h-6 px-2 text-xs ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 mr-1" />
          {label}
        </>
      )}
    </Button>
  );
}
