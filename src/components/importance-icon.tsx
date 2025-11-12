import { AlertTriangle, GripHorizontal, ArrowDown } from "lucide-react";
import type { Importance } from "@/lib/types";

export function ImportanceIcon({ importance }: { importance: Importance }) {
  switch (importance) {
    case "High":
      return (
        <AlertTriangle
          className="h-4 w-4 flex-shrink-0 text-red-500"
          aria-label="높음 중요도"
        />
      );
    case "Medium":
      return (
        <GripHorizontal
          className="h-4 w-4 flex-shrink-0 text-orange-500"
          aria-label="중간 중요도"
        />
      );
    case "Low":
      return (
        <ArrowDown
          className="h-4 w-4 flex-shrink-0 text-sky-500"
          aria-label="낮음 중요도"
        />
      );
    default:
      return null;
  }
}

    