
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
import { Grip, Menu, Repeat } from "lucide-react";
import { TodoDescription } from "./todo-description";

interface TodoItemProps {
  todo: Todo & { originalId?: string };
  onSelect: (todo: Todo) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, targetTodo: Todo) => void;
  isToday?: boolean;
  hideDragHandle?: boolean;
}

type DropPosition = 'top' | 'bottom' | null;

export function TodoItem({ todo, onSelect, onDrop, isToday, hideDragHandle }: TodoItemProps) {
  const [isPending, startTransition] = useTransition();
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCheckedChange = (checked: boolean) => {
    if (!user || !firestore) return;
    
    // For recurring instances, we update the original document.
    const targetId = todo.originalId || todo.id;
    if (!targetId) return;

    startTransition(() => {
      try {
        const todoRef = doc(firestore, "users", user.uid, "todos", targetId);
        let updateData: Partial<Omit<Todo, 'id'>> & { updatedAt: any };

        if (checked) {
          // When checking as completed
          updateData = {
            completed: true,
            originalOrder: todo.order, // Save the current order
            order: 0, // Move to top
            updatedAt: serverTimestamp(),
          };
        } else {
          // When unchecking
          updateData = {
            completed: false,
            order: todo.originalOrder ?? todo.order, // Restore original order, fallback to current
            originalOrder: null, // Clear the saved order by setting to null
            updatedAt: serverTimestamp(),
          };
        }

        updateDocumentNonBlocking(todoRef, updateData);

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
    e.dataTransfer.effectAllowed = 'move';
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

  const handleClick = (e: React.MouseEvent) => {
    onSelect(todo);
  };
  
  const isRecurringInstance = todo.isRecurring && !!todo.originalId;
  const isCompleted = isRecurringInstance ? false : todo.completed;

  return (
    <Card
      draggable={!todo.isRecurring && !hideDragHandle}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        "transition-colors duration-200 hover:bg-accent/40 relative",
        (!hideDragHandle && !todo.isRecurring) ? "mac-grab" : "cursor-pointer",
        isCompleted && "bg-muted/60",
        isToday && !isCompleted && "bg-card/60"
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
            disabled={isPending || isRecurringInstance}
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
          {!hideDragHandle && (
            <div
              className={cn("p-1 text-muted-foreground/50",
                todo.isRecurring && "opacity-50"
              )}
            >
              <Menu className="h-4 w-4" />
            </div>
          )}
        </div>
        {todo.description && <TodoDescription description={todo.description} />}
      </CardHeader>
    </Card>
  );
}
