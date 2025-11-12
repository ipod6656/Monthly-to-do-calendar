"use client";

import type { Todo } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/card";
import { ImportanceIcon } from "./importance-icon";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
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
      onClick={() => onSelect(todo)}
    >
      <CardHeader className="p-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id={`todo-${todo.id}`}
            checked={todo.completed}
            onCheckedChange={handleCheckedChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Mark ${todo.title} as ${
              todo.completed ? "not completed" : "completed"
            }`}
            disabled={isPending}
            className="flex-shrink-0 mt-0.5"
          />
          <div className="flex-grow flex items-start justify-between min-w-0">
             <div
              className={cn(
                "text-sm font-normal whitespace-pre-wrap break-words",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </div>
            <div className="flex-shrink-0 ml-2">
              <ImportanceIcon importance={todo.importance} />
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
