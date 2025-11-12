import { Calendar } from "@/components/calendar";
import { getTodos } from "@/lib/data";
import type { Todo } from "@/lib/types";

export default async function Home() {
  const todos: Todo[] = await getTodos();

  return <Calendar todos={todos} />;
}
