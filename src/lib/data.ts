import type { Todo } from "./types";
import { subDays, addDays, formatISO } from "date-fns";

// In-memory store for todos
let todos: Todo[] = [
  {
    id: "1",
    title: "Team Meeting",
    description: "Weekly sync-up meeting to discuss project progress and blockers. All team members are required to attend and provide updates on their tasks.",
    date: formatISO(new Date()),
    importance: "High",
    completed: false,
  },
  {
    id: "2",
    title: "Design Review",
    description: "Review the new UI/UX mockups for the dashboard.",
    date: formatISO(new Date()),
    importance: "Medium",
    completed: false,
  },
  {
    id: "3",
    title: "Submit Expense Report",
    description: "Finalize and submit the expense report for Q2.",
    date: formatISO(subDays(new Date(), 2)),
    importance: "Low",
    completed: true,
  },
  {
    id: "4",
    title: "Plan Q4 Roadmap",
    description: "Brainstorm and outline the product roadmap for the last quarter of the year. This is a very long description to test truncation. It should wrap or be truncated with a tooltip. Let's see how the AI decides to handle this. It might be better to show it on multiple lines.",
    date: formatISO(addDays(new Date(), 3)),
    importance: "High",
    completed: false,
  },
  {
    id: "5",
    title: "Code Refactoring",
    description: "Refactor the authentication module.",
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
