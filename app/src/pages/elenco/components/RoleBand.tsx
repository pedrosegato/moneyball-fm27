import { SLOT_BASE, SLOT_ON, SLOT_SECONDARY } from "@/components/pitch";
import type { RoleDef } from "@/engine/roles/catalog";
import { cn } from "@/lib/utils";
import { roleTitle } from "../lib/pitchSlotText";

interface RoleBandProps {
  role: RoleDef;
  className?: string;
}

export function RoleBand({ role, className }: RoleBandProps) {
  return (
    <span
      data-role={role.id}
      title={roleTitle(role)}
      className={cn(SLOT_BASE, role.phase === "ip" ? SLOT_ON : SLOT_SECONDARY, className)}
    >
      {role.shortName}
    </span>
  );
}
