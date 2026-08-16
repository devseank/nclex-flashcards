"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/shadcn/tooltip";

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="What does this chart show?"
          className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full border border-current text-[8px] font-mono leading-none cursor-help align-middle"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-48 font-mono text-[10px] leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}
