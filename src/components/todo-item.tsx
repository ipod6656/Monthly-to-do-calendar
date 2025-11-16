
"use client";

import type { Todo } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/card";
import { ImportanceIcon } from "./importance-icon";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransition, DragEvent, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, serverTimestamp } from "firebase/firestore";

interface TodoItemProps {
  todo: Todo;
  onSelect: (todo: Todo) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, todo: Todo) => void;
  isToday?: boolean;
}

export function TodoItem({ todo, onSelect, onDrop, isToday }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [mouseDownTime, setMouseDownTime] = useState(0);

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
  
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('todoId', todo.id);
    e.stopPropagation();
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDrop(e, todo);
  };
  
  const handleMouseDown = () => {
    setMouseDownTime(Date.now());
  };

  const handleMouseUp = () => {
    const timePressed = Date.now() - mouseDownTime;
    if (timePressed < 200) { // If it's a quick click, not a drag
      onSelect(todo);
    }
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(
        "cursor-pointer transition-colors duration-200 hover:bg-accent/20",
        todo.completed && "bg-muted/60",
        isToday && !todo.completed && "bg-card/60"
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
          <div className="flex-grow flex items-start justify-between min-w-0">
             <div
              className={cn(
                "text-sm font-normal whitespace-pre-wrap break-words",
                todo.completed && "line-through text-muted-foreground",
                todo.importance === "High" && !todo.completed && "text-red-500 font-bold"
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
