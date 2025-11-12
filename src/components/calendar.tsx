"use client";

import type { Todo } from "@/lib/types";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search as SearchIcon,
  Download,
  Loader2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TodoDialog } from "@/components/todo-dialog";
import { TodoItem } from "@/components/todo-item";
import { cn } from "@/lib/utils";
import { exportTodosByYear } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

export function Calendar({ todos }: { todos: Todo[] }) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isExporting, startExportTransition] = useTransition();

  const handleOpenNewTodoDialog = (date: Date) => {
    setSelectedDate(date);
    setSelectedTodo(null);
    setDialogOpen(true);
  };

  const handleSelectTodo = (todo: Todo) => {
    setSelectedTodo(todo);
    setSelectedDate(null);
    setDialogOpen(true);
  };

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) =>
      todo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [todos, searchQuery]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const firstDayOfCalendar = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
  const lastDayOfCalendar = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: firstDayOfCalendar,
    end: lastDayOfCalendar,
  }).filter((day) => {
    const dayOfWeek = getDay(day);
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  });

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleExport = () => {
    startExportTransition(async () => {
      try {
        const csvString = await exportTodosByYear(currentDate.getFullYear());
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `todos_${currentDate.getFullYear()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: "Export Successful",
          description: `Todos for ${currentDate.getFullYear()} have been exported.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Export Failed",
          description: "Could not export todos. Please try again.",
        });
      }
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-headline text-primary">
            Monthly to-do Calendar
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-40 text-center">
            <h2 className="text-2xl font-semibold">
              {format(currentDate, "yyyy MMMM")}
            </h2>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search todos..."
              className="pl-10 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Year
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="pb-2 text-center font-bold text-primary sticky top-0 bg-background z-10"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-5 gap-2 overflow-y-auto">
        {calendarDays.map((day) => {
          const todosForDay = filteredTodos.filter((todo) =>
            isSameDay(new Date(todo.date), day)
          );
          return (
            <Card
              key={day.toString()}
              className={cn(
                "transition-colors duration-200 hover:bg-accent/30 flex flex-col",
                !isSameMonth(day, currentDate) && "bg-muted/50"
              )}
            >
              <CardContent className="p-2 flex-grow flex flex-col">
                <div className="flex justify-between items-center">
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "font-semibold",
                      isSameDay(day, new Date()) && "text-accent-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </time>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={() => handleOpenNewTodoDialog(day)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 space-y-2 flex-grow min-h-[60px]">
                  {todosForDay.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onSelect={handleSelectTodo}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <TodoDialog
        isOpen={isDialogOpen}
        setOpen={setDialogOpen}
        todo={selectedTodo}
        selectedDate={selectedDate}
      />
    </div>
  );
}
