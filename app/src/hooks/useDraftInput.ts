import { type ChangeEvent, type KeyboardEvent, useState } from "react";

export interface DraftInputOptions {
  shown: string;
  accept(text: string): boolean;
  discardInvalidOnBlur?: boolean;
  stopEscape?: boolean;
}

export function useDraftInput({ shown, accept, discardInvalidOnBlur = false, stopEscape = false }: DraftInputOptions) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const reset = () => {
    setDraft(null);
    setInvalid(false);
  };
  const commit = (keepInvalid: boolean) => {
    if (draft === null) return;
    if (accept(draft)) reset();
    else if (keepInvalid) setInvalid(true);
    else reset();
  };

  return {
    draft,
    invalid,
    reset,
    inputProps: {
      value: draft ?? shown,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setDraft(e.target.value);
        setInvalid(false);
      },
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) commit(true);
        else if (e.key === "Escape" && draft !== null) {
          e.preventDefault();
          if (stopEscape) e.stopPropagation();
          reset();
        }
      },
      onBlur: () => commit(!discardInvalidOnBlur),
    },
  };
}
