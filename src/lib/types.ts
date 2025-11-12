export type Importance = "High" | "Medium" | "Low";

export interface Todo {
  id: string;
  date: string; // Using ISO string for serialization
  title: string;
  importance: Importance;
  completed: boolean;
}

    