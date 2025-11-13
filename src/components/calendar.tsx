
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
  LogOut,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TodoDialog } from "@/components/todo-dialog";
import { TodoItem } from "@/components/todo-item";
import { cn } from "@/lib/utils";
import { exportTodosByYear, deleteUserTodos } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { deleteUser } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Calendar() {
  useAuthRedirect({ to: '/login', condition: 'unauthenticated' });
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const todosRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, "users", user.uid, "todos");
  }, [firestore, user]);

  const todosQuery = useMemoFirebase(() => {
    if (!todosRef) return null;
    return query(todosRef);
  }, [todosRef]);

  const { data: todos, isLoading: todosLoading } = useCollection<Todo>(todosQuery);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: '로그아웃 되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '로그아웃에 실패했습니다.' });
    }
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    startDeleteTransition(async () => {
      try {
        // First, delete Firestore data
        await deleteUserTodos(user.uid);
        // Then, delete the user account
        await deleteUser(user);
        toast({ title: "계정이 성공적으로 삭제되었습니다." });
        // Redirect is handled by useAuthRedirect hook
      } catch (error: any) {
        console.error("Error deleting account: ", error);
        toast({
          variant: "destructive",
          title: "계정 삭제 실패",
          description: "계정을 삭제하는 중 오류가 발생했습니다. 다시 로그인한 후 시도해주세요.",
        });
      }
    });
  };

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
    if (!todos) return [];
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
  const goToToday = () => setCurrentDate(new Date());


  const handleExport = () => {
    if (!user) return;
    startExportTransition(async () => {
      try {
        const csvString = await exportTodosByYear(currentDate.getFullYear(), user.uid);
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

  if (isUserLoading || (user && todosLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background text-foreground p-4 md:p-6 lg:p-8" style={{ height: 'var(--vh, 100vh)' }}>
       <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Monthly to-do Calendar
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="border-primary/50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-48 text-center">
            <h1 className="text-3xl font-bold font-headline text-foreground">
              <div>{format(currentDate, "yyyy")}</div>
              <div>{format(currentDate, "MMMM")}</div>
            </h1>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth} className="border-primary/50">
            <ChevronRight className="h-4 w-4" />
          </Button>
           <Button variant="outline" onClick={goToToday} className="ml-4 font-semibold border border-primary/50">
            Today
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
           <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                회원 탈퇴
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 계정과 모든 할 일 데이터가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  탈퇴
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          const isToday = isSameDay(day, new Date());
          return (
            <Card
              key={day.toString()}
              className={cn(
                "transition-colors duration-200 hover:bg-accent/30 flex flex-col relative",
                !isSameMonth(day, currentDate) && "bg-muted/50",
                isToday && "bg-accent/50"
              )}
            >
              <CardContent className="p-2 flex-grow flex flex-col">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                    <time
                      dateTime={format(day, "yyyy-MM-dd")}
                      className={cn(
                        "font-semibold",
                        isToday && "text-accent-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </time>
                    {isToday && (
                       <Badge className="bg-primary text-primary-foreground">
                        Today
                      </Badge>
                    )}
                  </div>
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
                      isToday={isToday}
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
