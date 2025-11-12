"use client";

import type { Todo } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportanceIcon } from "./importance-icon";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFirestore, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, serverTimestamp } from "firebase/firestore";

interface TodoItemProps {
  todo: Todo;
  onSelect: (todo: Todo) => void;
}

export function TodoItem({ todo, onSelect }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCheckedChange = (checked: boolean) => {
    if (!user || !firestore) return;
    startTransition(() => {
      try {
        const todoRef = doc(firestore, "users", user.uid, "todos", todo.id);
        updateDocumentNonBlocking(todoRef, {
          ...todo,
          completed: checked,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: "Failed to update the todo. Please try again.",
        });
      }
    });
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors duration-200 hover:bg-accent/20",
        todo.completed && "bg-muted/60"
      )}
    >
      <CardHeader className="p-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`todo-${todo.id}`}
            checked={todo.completed}
            onCheckedChange={handleCheckedChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Mark ${todo.title} as ${
              todo.completed ? "not completed" : "completed"
            }`}
            disabled={isPending}
            className="flex-shrink-0"
          />
          <div
            onClick={() => onSelect(todo)}
            className="flex-grow flex items-center justify-between min-w-0"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle
                    className={cn(
                      "text-sm font-normal truncate",
                      todo.completed && "line-through text-muted-foreground"
                    )}
                  >
                    <span className="pr-2">{todo.title}</span>
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{todo.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ImportanceIcon importance={todo.importance} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
