import type { Todo } from "./types";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import { useFirestore } from "@/firebase";

// This file now interacts with Firebase
const TODOS_COLLECTION = "todos";

export async function getTodosForUser(userId: string): Promise<Todo[]> {
  const db = getFirestore();
  const todosCol = collection(db, "users", userId, "todos");
  const todoSnapshot = await getDocs(todosCol);
  const todoList = todoSnapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id } as Todo)
  );
  return todoList;
}

export function addTodo(
  userId: string,
  todo: Omit<Todo, "id" | "completed">
): Promise<any> {
  const db = useFirestore();
  const newTodo = {
    ...todo,
    completed: false,
    createdAt: serverTimestamp(),
  };
  return addDocumentNonBlocking(
    collection(db, "users", userId, "todos"),
    newTodo
  );
}

export function updateTodo(
  userId: string,
  id: string,
  update: Partial<Omit<Todo, "id">>
): void {
  const db = useFirestore();
  const todoRef = doc(db, "users", userId, "todos", id);
  updateDocumentNonBlocking(todoRef, {
    ...update,
    updatedAt: serverTimestamp(),
  });
}

export function deleteTodo(userId: string, id: string): void {
  const db = useFirestore();
  const todoRef = doc(db, "users", userId, "todos", id);
  deleteDocumentNonBlocking(todoRef);
}

// The following functions are not used anymore but kept for reference or future use.

// In-memory store for todos
let todos: Todo[] = [];

// Simulate API latency
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getTodos(): Promise<Todo[]> {
  await delay(50);
  return todos;
}
