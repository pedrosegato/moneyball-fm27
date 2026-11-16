import { cva } from "class-variance-authority";

export const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,scale] duration-(--duration-press) ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-(--motion-press-scale) disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg aria-pressed:bg-surface-active aria-pressed:text-fg",
        outline:
          "border border-input bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg aria-pressed:bg-surface-active aria-pressed:text-fg",
        group:
          "border border-transparent text-fg-muted hover:text-fg active:bg-surface-hover aria-pressed:border-line aria-pressed:bg-surface-control aria-pressed:text-fg",
      },
      size: {
        default: "h-8 min-w-8 px-2.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-md px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-2.5 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 rounded-md px-2 type-label [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
