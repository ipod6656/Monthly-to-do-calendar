import type { Todo } from "./types";
import { subDays, addDays, formatISO } from "date-fns";

// In-memory store for todos
let todos: Todo[] = [
  {
    id: "1",
    title: "Team Meeting",
    date: formatISO(new Date()),
    importance: "High",
    completed: false,
  },
  {
    id: "2",
    title: "Design Review",
    date: formatISO(new Date()),
    importance: "Medium",
    completed: false,
  },
  {
    id: "3",
    title: "Submit Expense Report",
    date: formatISO(subDays(new Date(), 2)),
    importance: "Low",
    completed: true,
  },
  {
    id: "4",
    title: "Plan Q4 Roadmap",
    date: formatISO(addDays(new Date(), 3)),
    importance: "High",
    completed: false,
  },
  {
    id: "5",
    title: "Code Refactoring",
    date: formatISO(addDays(new Date(), 5)),
    importance: "Medium",
    completed: false,
  },
];

// Simulate API latency
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function getTodos(): Promise<Todo[]> {
  await delay(50);
  return todos;
}

export async function addTodo(todo: Omit<Todo, "id" | "completed">): Promise<Todo> {
  await delay(50);
  const newTodo: Todo = {
    ...todo,
    id: Date.now().toString(),
    completed: false,
  };
  todos.push(newTodo);
  return newTodo;
}

export async function updateTodo(
  id: string,
  update: Partial<Omit<Todo, "id">>
): Promise<Todo | null> {
  await delay(50);
  const todoIndex = todos.findIndex((t) => t.id === id);
  if (todoIndex === -1) return null;

  todos[todoIndex] = { ...todos[todoIndex], ...update };
  return todos[todoIndex];
}

export async function deleteTodo(id: string): Promise<boolean> {
  await delay(50);
  const initialLength = todos.length;
  todos = todos.filter((t) => t.id !== id);
  return todos.length < initialLength;
}
