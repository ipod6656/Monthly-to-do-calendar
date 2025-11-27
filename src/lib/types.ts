export type Importance = "High" | "Medium" | "Low";

export interface Todo {
  id: string;
  date: string; // Using ISO string for serialization
  title: string;
  description?: string;
  importance: Importance;
  completed: boolean;
  order: number;
  isRecurring?: boolean;
  originalOrder?: number | null;
}
