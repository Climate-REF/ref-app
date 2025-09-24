import type { ExecutionOutput } from "@/client";

export function Figure({ url, long_name }: ExecutionOutput) {
  return (
    <div className="flex flex-col items-center gap-2 max-w-full max-h-96 overflow-hidden">
      <img src={url} alt={long_name} className="object-contain" />
      <small className="text-muted-foreground">{long_name}</small>
    </div>
  );
}
