
"use server";

import type { Todo } from "./types";

// The Todo object coming from the client might not have an ID if it's new
// but for printing, we can assume it's a full Todo with an ID.
type PrintableTodo = Omit<Todo, 'order' | 'completed'> & {
  id: string;
  completed: boolean;
};

export async function exportTodosByYear(year: number, todos: PrintableTodo[]): Promise<string> {
  const yearTodos = todos.filter(
    (todo) => new Date(todo.date).getFullYear() === year
  );

  if (yearTodos.length === 0) {
    // This will be caught by the client and shown in a toast.
    throw new Error("No todos found for the selected year.");
  }

  const headers = [
    "ID",
    "날짜",
    "제목",
    "중요도",
    "완료 여부",
  ];
  const csvRows = [headers.join(",")];

  yearTodos.forEach((todo, index) => {
    const values = [
      index + 1,
      new Date(todo.date).toLocaleDateString('ko-KR'),
      `"${todo.title.replace(/"/g, '""')}"`,
      todo.importance,
      todo.completed,
    ].join(",");
    csvRows.push(values);
  });

  // Add BOM for UTF-8 to ensure Excel reads Korean characters correctly.
  const BOM = "\uFEFF";
  return BOM + csvRows.join("\n");
}

    