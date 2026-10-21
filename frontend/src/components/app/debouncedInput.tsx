import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface DebouncedInputProps
  extends Omit<
    ComponentProps<typeof Input>,
    "value" | "defaultValue" | "onChange"
  > {
  value: string;
  /** Called with the typed text once typing pauses for `delay` milliseconds */
  onValueChange: (value: string) => void;
  delay?: number;
}

/**
 * A text input that reports changes only once typing pauses
 *
 * It shows what is typed straight away and follows `value` when it changes from outside,
 * such as when filters are cleared.
 */
export function DebouncedInput({
  value,
  onValueChange,
  delay = 300,
  ...props
}: DebouncedInputProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSent = useRef(value);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });

  // A value we did not send came from outside, so it replaces the draft and any pending change
  useEffect(() => {
    if (value !== lastSent.current) {
      clearTimeout(timer.current);
      lastSent.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Input
      {...props}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          lastSent.current = next;
          onValueChangeRef.current(next);
        }, delay);
      }}
    />
  );
}
