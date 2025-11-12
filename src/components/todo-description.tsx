"use client";

import {
  truncateTodoDescription,
  type TruncateTodoDescriptionOutput,
} from "@/ai/flows/truncate-todo-description";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export function TodoDescription({ description }: { description: string }) {
  const [result, setResult] = useState<TruncateTodoDescriptionOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    truncateTodoDescription({ description, maxLength: 30 })
      .then((res) => {
        if (isMounted) {
          setResult(res);
        }
      })
      .catch((err) => {
        console.error("AI flow failed, using fallback.", err);
        // Fallback for when AI flow fails
        if (isMounted) {
          setResult({
            truncatedDescription: description.substring(0, 30) + "...",
            useTooltip: description.length > 30,
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [description]);

  if (isLoading) {
    return <Skeleton className="h-4 w-full mt-1" />;
  }

  if (!result) return null;

  if (result.useTooltip) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-sm text-muted-foreground truncate cursor-help mt-1">
              {result.truncatedDescription}
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
      {result.truncatedDescription}
    </p>
  );
}
