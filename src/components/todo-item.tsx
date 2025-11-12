"use client";

import type { Todo } from "@/lib/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportanceIcon } from "./importance-icon";
import { cn } from "@/lib/utils";
import { TodoDescription } from "./todo-description";

interface TodoItemProps {
  todo: Todo;
  onSelect: (todo: Todo) => void;
}

export function TodoItem({ todo, onSelect }: TodoItemProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors duration-200 hover:bg-accent/20",
        todo.completed && "bg-muted/60"
      )}
      onClick={() => onSelect(todo)}
    >
      <CardHeader className="p-2">
        <CardTitle
          className={cn(
            "flex items-center justify-between text-sm",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          <span className="truncate pr-2">{todo.title}</span>
          <ImportanceIcon importance={todo.importance} />
        </CardTitle>
        {todo.description && <TodoDescription description={todo.description} />}
      </CardHeader>
    </Card>
  );
}
