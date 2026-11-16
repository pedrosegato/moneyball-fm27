import { useState } from "react";
import { assignSlots } from "../lib/slots";

export function useSlots(compare: readonly number[]) {
  const [memory, setMemory] = useState(() => ({ compare, slots: assignSlots(compare, new Map()) }));
  if (memory.compare === compare) return memory.slots;
  const slots = assignSlots(compare, memory.slots);
  setMemory({ compare, slots });
  return slots;
}
