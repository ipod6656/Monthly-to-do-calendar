import { AlertTriangle, Minus, ArrowDown } from "lucide-react";
import type { Importance } from "@/lib/types";

export function ImportanceIcon({ importance }: { importance: Importance }) {
  switch (importance) {
    case "High":
      return (
        <AlertTriangle
          className="h-4 w-4 flex-shrink-0 text-red-500"
          aria-label="High importance"
        />
      );
    case "Medium":
      return (
        <Minus
          className="h-4 w-4 flex-shrink-0 text-orange-500"
          aria-label="Medium importance"
        />
      );
    case "Low":
      return (
        <ArrowDown
          className="h-4 w-4 flex-shrink-0 text-sky-500"
          aria-label="Low importance"
        />
      );
    default:
      return null;
  }
}
