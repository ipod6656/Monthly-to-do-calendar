"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TodoDescription({ description }: { description: string }) {
  const maxLength = 30;
  const needsTruncation = description.length > maxLength;
  const displayText = needsTruncation
    ? description.substring(0, maxLength) + "..."
    : description;

  if (needsTruncation) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-sm text-muted-foreground truncate cursor-help mt-1">
              {displayText}
            </p>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
      {description}
    </p>
  );
}
