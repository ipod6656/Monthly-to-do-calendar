
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { initializeFirebase } from "@/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const todoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  importance: z.enum(["High", "Medium", "Low"]),
  completed: z.boolean().default(false),
});

async function getDb() {
  return initializeFirebase().firestore;
}


export async function createTodoAction(userId: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  const validatedFields = todoSchema.omit({completed: true}).safeParse(rawData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const db = await getDb();
    const todosCollection = collection(db, "users", userId, "todos");
    await addDoc(todosCollection, {
        ...validatedFields.data,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to create todo." };
  }
}

export async function updateTodoAction(userId: string, id: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  const completed = rawData.completed === 'true';

  const validatedFields = todoSchema.safeParse({ ...rawData, completed });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  try {
    const db = await getDb();
    const todoRef = doc(db, "users", userId, "todos", id);
    await updateDoc(todoRef, {
        ...validatedFields.data,
        updatedAt: serverTimestamp(),
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update todo." };
  }
}

export async function deleteTodoAction(userId: string, id: string) {
  try {
    const db = await getDb();
    const todoRef = doc(db, "users", userId, "todos", id);
    await deleteDoc(todoRef);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to delete todo." };
  }
}

export async function exportTodosByYear(year: number, userId: string): Promise<string> {
  const db = await getDb();
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
