
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/firebase/server-init";
import { collection, getDocs } from "firebase/firestore";
import type { Todo } from "./types";


export async function exportTodosByYear(year: number, userId: string): Promise<string> {
  const db = getDb();
  const todosCol = collection(db, "users", userId, "todos");
  const todoSnapshot = await getDocs(todosCol);
  const allTodos = todoSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id } as Todo)
  );

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
