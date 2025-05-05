import type { ExecutionOutput } from "@/client";

export function Figure({ url, description }: ExecutionOutput) {
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={url} alt={description} />
      <small>{description}</small>
    </div>
  );
}
