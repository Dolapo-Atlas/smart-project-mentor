import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Atlas card system.
 *
 * `variant="default"` keeps the original appearance so every existing call
 * site is untouched. `variant="soft"` is the Atlas "luminous depth" look:
 * a tinted surface, generous radius, layered soft shadow and a tinted border.
 * Pair it with a `tone` to pick the tint.
 */
const cardVariants = cva("text-card-foreground transition-all duration-500", {
  variants: {
    variant: {
      default: "rounded-xl border bg-card shadow",
      soft: "rounded-3xl border shadow-[var(--shadow-soft)] md:rounded-[2.5rem]",
      outline: "rounded-3xl border-2 bg-transparent",
    },
    tone: {
      neutral: "",
      navy: "",
      orange: "",
      cream: "",
      green: "",
      lilac: "",
    },
    interactive: {
      true: "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      false: "",
    },
  },
  compoundVariants: [
    // Tinted surfaces only apply to the soft / outline variants.
    {
      variant: "soft",
      tone: "neutral",
      class: "border-surface-neutral-border bg-surface-neutral",
    },
    { variant: "soft", tone: "navy", class: "border-surface-navy-border bg-surface-navy" },
    { variant: "soft", tone: "orange", class: "border-surface-orange-border bg-surface-orange" },
    { variant: "soft", tone: "cream", class: "border-surface-cream-border bg-surface-cream" },
    { variant: "soft", tone: "green", class: "border-surface-green-border bg-surface-green" },
    { variant: "soft", tone: "lilac", class: "border-surface-lilac-border bg-surface-lilac" },
    { variant: "outline", tone: "neutral", class: "border-surface-neutral-border" },
    { variant: "outline", tone: "navy", class: "border-surface-navy-border" },
    { variant: "outline", tone: "orange", class: "border-surface-orange-border" },
    { variant: "outline", tone: "cream", class: "border-surface-cream-border" },
    { variant: "outline", tone: "green", class: "border-surface-green-border" },
    { variant: "outline", tone: "lilac", class: "border-surface-lilac-border" },
    {
      variant: "soft",
      interactive: true,
      class:
        "hover:shadow-[var(--shadow-soft-lift)] motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99]",
    },
    {
      variant: "default",
      interactive: true,
      class: "hover:shadow-lg motion-safe:hover:-translate-y-0.5",
    },
  ],
  defaultVariants: { variant: "default", tone: "neutral", interactive: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, tone, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, tone, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
