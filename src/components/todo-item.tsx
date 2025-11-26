
"use client";

import type { Todo } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransition, DragEvent, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, serverTimestamp } from "firebase/firestore";
import { Grip, Repeat } from "lucide-react";

interface TodoItemProps {
  todo: Todo & { originalId?: string };
  onSelect: (todo: Todo) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, targetTodo: Todo) => void;
  isToday?: boolean;
}

type DropPosition = 'top' | 'bottom' | null;

export function TodoItem({ todo, onSelect, onDrop, isToday }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const [isDraggable, setDraggable] = useState(false);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCheckedChange = (checked: boolean) => {
    if (!user || !firestore || !todo.originalId) return; // Prevent updating recurring instances
    startTransition(() => {
      try {
        const todoRef = doc(firestore, "users", user.uid, "todos", todo.originalId || todo.id);
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
    // We must use the original ID for database operations
    e.dataTransfer.setData('todoId', todo.originalId || todo.id);
    e.stopPropagation();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const midY = rect.top + rect.height / 2;

    if (mouseY < midY) {
      setDropPosition('top');
    } else {
      setDropPosition('bottom');
    }
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);
    onDrop(e, todo);
  };

  const handleClick = () => {
    // Only select if not dragging
    if (!isDraggable) {
      onSelect(todo);
    }
  };

  const isCompleted = todo.isRecurring ? false : todo.completed;

  return (
    <Card
      draggable={isDraggable && !todo.isRecurring}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      onMouseUp={() => {
        // This ensures dragging stops even if mouse is released outside the item
        if (isDraggable) setDraggable(false);
      }}
      className={cn(
        "cursor-pointer transition-colors duration-200 hover:bg-accent/20 relative",
        isCompleted && "bg-muted/60",
        isToday && !isCompleted && "bg-card/60",
        isDraggable && "opacity-50"
      )}
    >
      {dropPosition === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded-full" />
      )}
      {dropPosition === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 z-10 rounded-full" />
      )}
      <CardHeader className="p-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`todo-${todo.id}`}
            checked={isCompleted}
            onCheckedChange={handleCheckedChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Mark ${todo.title} as ${
              isCompleted ? "not completed" : "completed"
            }`}
            disabled={isPending || todo.isRecurring}
            className="flex-shrink-0"
          />
          <div
            className={cn(
              "flex-grow text-sm font-normal whitespace-pre-wrap break-words",
              isCompleted && "line-through text-muted-foreground",
              todo.importance === "High" && !isCompleted && "text-red-500 font-bold"
            )}
          >
            {todo.title}
          </div>
          {todo.isRecurring && <Repeat className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <div
            onMouseDown={(e) => {
              if (todo.isRecurring) return;
              e.stopPropagation();
              setDraggable(true);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              setDraggable(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn("cursor-move p-1 text-muted-foreground hover:text-foreground touch-none",
              todo.isRecurring && "cursor-not-allowed opacity-50"
            )}
          >
            <Grip className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
