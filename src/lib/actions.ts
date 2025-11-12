"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addTodo, deleteTodo, getTodos, updateTodo } from "./data";
import type { Todo } from "./types";

const todoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  importance: z.enum(["High", "Medium", "Low"]),
});

export async function createTodoAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = todoSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await addTodo(validatedFields.data);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to create todo." };
  }
}

export async function updateTodoAction(id: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = todoSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const completed = formData.get('completed') === 'true';

  try {
    await updateTodo(id, {...validatedFields.data, completed});
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update todo." };
  }
}

export async function deleteTodoAction(id: string) {
  try {
    await deleteTodo(id);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete todo." };
  }
}

export async function exportTodosByYear(year: number): Promise<string> {
  const allTodos = await getTodos();
  const yearTodos = allTodos.filter(
    (todo) => new Date(todo.date).getFullYear() === year
  );

  if (yearTodos.length === 0) {
    return "No todos found for the selected year.";
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

  // Add BOM for UTF-8
  const BOM = "\uFEFF";
  return BOM + csvRows.join("\n");
}
