
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
import { Grip } from "lucide-react";

interface TodoItemProps {
  todo: Todo;
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


  return (
    <Card
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        "cursor-pointer transition-colors duration-200 hover:bg-accent/20 relative",
        todo.completed && "bg-muted/60",
        isToday && !todo.completed && "bg-card/60"
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
            className={cn(
              "flex-grow text-sm font-normal whitespace-pre-wrap break-words",
              todo.completed && "line-through text-muted-foreground",
              todo.importance === "High" && !todo.completed && "text-red-500 font-bold"
            )}
          >
            {todo.title}
          </div>
          <div
            onMouseDown={() => setDraggable(true)}
            onMouseUp={() => setDraggable(false)}
            onMouseLeave={() => { if (isDraggable) setDraggable(false); }}
            onClick={(e) => e.stopPropagation()}
            className="cursor-move p-1 text-muted-foreground hover:text-foreground"
          >
            <Grip className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
