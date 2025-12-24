
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
  parseISO,
  getDate,
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMemo, useState, useTransition, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TodoDialog } from "@/components/todo-dialog";
import { TodoItem } from "@/components/todo-item";
import { cn } from "@/lib/utils";
import { exportTodosByYear } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, getDocs, writeBatch, doc, serverTimestamp, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getHolidays } from "@/lib/holidays";

export function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isCalendarCollapsed, setCalendarCollapsed] = useState(false);

  const auth = useAuth();
  const { user } = useUser();
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
    if (!user || !firestore) return;
    
    startDeleteTransition(async () => {
      try {
        const todosCollectionRef = collection(firestore, "users", user.uid, "todos");
        const todosSnapshot = await getDocs(todosCollectionRef);
        const batch = writeBatch(firestore);
        todosSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        await deleteUser(user);
        
        toast({ title: "계정이 성공적으로 삭제되었습니다." });

      } catch (error: any) {
        console.error("Error deleting account: ", error);
        toast({
          variant: "destructive",
          title: "계정 삭제 실패",
          description:
            error.code === 'auth/requires-recent-login'
              ? "보안을 위해 다시 로그인한 후 시도해주세요."
              : "계정을 삭제하는 중 오류가 발생했습니다. 다시 시도해주세요.",
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
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
 const handleDropOnTodo = (e: DragEvent<HTMLDivElement>, targetTodo: Todo) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore || !todos) return;

    const draggedTodoId = e.dataTransfer.getData('todoId');
    if (!draggedTodoId || draggedTodoId === targetTodo.id) return;

    const draggedTodo = todos.find(t => t.id === draggedTodoId);
    if (!draggedTodo) return;
    
    const targetDateStr = targetTodo.date;
    const originalDateStr = draggedTodo.date;

    const allTodosForTargetDayUnsorted = todos.filter(t => 
      t.date === targetDateStr && t.id !== draggedTodoId
    );

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isDroppingOnLowerHalf = e.clientY > rect.top + rect.height / 2;

    const allTodosForTargetDaySorted = allTodosForTargetDayUnsorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const targetIndexInDay = allTodosForTargetDaySorted.findIndex(t => t.id === targetTodo.id);

    let newIndex;
    if (isDroppingOnLowerHalf) {
        newIndex = targetIndexInDay + 1;
    } else {
        newIndex = targetIndexInDay;
    }

    const newDayTodos = [...allTodosForTargetDaySorted];
    newDayTodos.splice(newIndex, 0, { ...draggedTodo, date: targetDateStr } as Todo);

    const batch = writeBatch(firestore);

    newDayTodos.forEach((todo, index) => {
      const todoRef = doc(firestore, 'users', user.uid, 'todos', todo.id);
      const newOrder = (index + 1) * 10;
      if (todo.order !== newOrder || todo.date !== targetDateStr) {
        batch.update(todoRef, { order: newOrder, date: targetDateStr });
      }
    });

    if (originalDateStr !== targetDateStr) {
      const sourceDayTodos = todos
        .filter(t => t.date === originalDateStr && t.id !== draggedTodoId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      sourceDayTodos.forEach((todo, index) => {
        const sourceTodoRef = doc(firestore, 'users', user.uid, 'todos', todo.id);
        const newSourceOrder = (index + 1) * 10;
        if (todo.order !== newSourceOrder) {
            batch.update(sourceTodoRef, { order: newSourceOrder });
        }
      });
    }
    
    batch.commit().catch(err => {
        console.error("Drop on todo batch commit failed", err);
        toast({
          variant: "destructive",
          title: "순서 변경 실패",
          description: "데이터베이스 오류가 발생했습니다."
        });
      });
  };

  const handleDropOnDay = (e: DragEvent<HTMLDivElement>, dropDate: Date) => {
    e.preventDefault();
    if (!user || !firestore || !todos) return;

    const draggedTodoId = e.dataTransfer.getData('todoId');
    if (!draggedTodoId) return;
    
    const draggedTodo = todos.find(t => t.id === draggedTodoId);
    if (!draggedTodo) return;

    const newDateStr = format(dropDate, 'yyyy-MM-dd');
    const oldDateStr = draggedTodo.date;

    if (newDateStr === oldDateStr) return;

    const todoRef = doc(firestore, 'users', user.uid, 'todos', draggedTodoId);

    // If a recurring todo is dropped on a new date, make it a single instance
    if (draggedTodo.isRecurring) {
        updateDocumentNonBlocking(todoRef, { 
          date: newDateStr, 
          isRecurring: false,
          updatedAt: serverTimestamp(),
        });
    } else {
        const targetDayTodos = todos.filter(t => t.date === newDateStr);
        const newOrder = (targetDayTodos.length > 0) 
          ? Math.max(...targetDayTodos.map(t => t.order)) + 10 
          : Date.now();
        
        const batch = writeBatch(firestore)
        batch.update(todoRef, { date: newDateStr, order: newOrder });

        const sourceDayTodos = todos
            .filter(t => t.date === oldDateStr && t.id !== draggedTodoId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        sourceDayTodos.forEach((todo, index) => {
            const sourceTodoRef = doc(firestore, 'users', user.uid, 'todos', todo.id);
            const newSourceOrder = (index + 1) * 10;
            if (todo.order !== newSourceOrder) {
                batch.update(sourceTodoRef, { order: newSourceOrder });
            }
        });
        
        batch.commit().catch(err => {
            console.error("Drop on day batch commit failed", err);
            toast({
              variant: "destructive",
              title: "이동 실패",
              description: "데이터베이스 오류가 발생했습니다."
            });
          });
    }
  };

  const holidays = useMemo(() => getHolidays(currentDate.getFullYear()), [currentDate]);

  const allTodosForCalendar = useMemo(() => {
    if (!todos) return [];
  
    const recurringTodosExpanded: Todo[] = [];
  
    todos.forEach(todo => {
      if (todo.isRecurring) {
        const originalDate = parseISO(todo.date);
        const dayOfMonth = getDate(originalDate);
  
        // Create instances for a wide range of months to be safe
        for (let i = -12; i <= 12; i++) {
          let targetMonth = addMonths(currentDate, i);
          let newDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dayOfMonth);
  
          // Check if the date is valid (e.g., handles Feb 30)
          if (getDate(newDate) === dayOfMonth) {
            recurringTodosExpanded.push({
              ...todo,
              // Keep original ID for selection, but a new key for rendering
              id: `${todo.id}-recurring-${format(newDate, 'yyyy-MM-dd')}`,
              originalId: todo.id,
              date: format(newDate, 'yyyy-MM-dd'),
              completed: false, // Recurring todos are never shown as completed in future months
            });
          }
        }
      } else {
        recurringTodosExpanded.push(todo);
      }
    });
  
    return recurringTodosExpanded.filter((todo) =>
      todo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [todos, searchQuery, currentDate]);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const calendarDays = useMemo(() => {
    const firstDayOfCalendar = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const lastDayOfCalendar = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: firstDayOfCalendar,
      end: lastDayOfCalendar,
    });
  }, [firstDayOfMonth, lastDayOfMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(agendaDate, { weekStartsOn: 1 });
    const end = endOfWeek(agendaDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [agendaDate]);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const mobileWeekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setAgendaDate(new Date());
  };

  const handleExport = () => {
    if (!user || !todos) return;
    startExportTransition(async () => {
      try {
        const plainTodos = todos.map(todo => ({
          id: todo.id,
          title: todo.title,
          date: todo.date,
          importance: todo.importance,
          completed: todo.completed,
        }));
        
        const csvString = await exportTodosByYear(currentDate.getFullYear(), plainTodos);
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
        console.error("Export error:", error);
        toast({
          variant: "destructive",
          title: "Export Failed",
          description: "Could not export todos. Please try again.",
        });
      }
    });
  };

  const todosForAgenda = useMemo(() => {
    return allTodosForCalendar
      .filter((todo) => isSameDay(new Date(todo.date), agendaDate))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allTodosForCalendar, agendaDate]);

  const MobileCalendarGrid = ({ days }: { days: Date[] }) => (
    <div className="grid grid-cols-7 gap-y-2">
      {days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const holiday = holidays.find(h => h.date === dayStr);
        const todosForDay = allTodosForCalendar.filter(todo => isSameDay(new Date(todo.date), day));
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, agendaDate);
        const isCurrentMonth = isSameMonth(day, currentDate);
        
        return (
          <div
            key={day.toString()}
            className={cn(
              "flex flex-col items-center justify-start pb-2 transition-opacity",
              !isCurrentMonth && "opacity-50"
            )}
            onClick={() => {
              if (!isCurrentMonth) {
                setCurrentDate(day);
              }
              setAgendaDate(day);
              setCalendarCollapsed(true);
            }}
          >
            <div className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
              isToday && "bg-red-500 text-white",
              isSelected && !isToday && "bg-primary text-primary-foreground",
               (getDay(day) === 0 || holiday) && !isSelected && !isToday && "text-red-500",
            )}>
              <time dateTime={format(day, "yyyy-MM-dd")}>
                {format(day, "d")}
              </time>
            </div>
            <div className="flex space-x-1 mt-1">
              {todosForDay.slice(0, 3).map(todo => (
                <div key={todo.id} className={cn("w-1.5 h-1.5 rounded-full", {
                  "bg-red-500": todo.importance === "High",
                  "bg-yellow-500": todo.importance === "Medium",
                  "bg-green-500": todo.importance === "Low",
                })} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );


  if (todosLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search todos..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleExport} disabled={isExporting} className="hidden md:flex">
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Year
            </Button>
            <div className="flex items-center gap-2">
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleLogout} variant="outline" size="icon">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">로그아웃</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>로그아웃</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4" />
                         <span className="sr-only">회원 탈퇴</span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>회원 탈퇴</p>
                  </TooltipContent>
                </Tooltip>
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
          </div>
        </header>
        
        {/* Mobile View: Collapsible Calendar + Agenda */}
        <div className="md:hidden flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-2">
            {mobileWeekdays.map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
          </div>
          
          <Collapsible open={!isCalendarCollapsed} onOpenChange={(open) => setCalendarCollapsed(!open)} className="flex flex-col">
            
            {isCalendarCollapsed && <MobileCalendarGrid days={weekDays} />}

            <CollapsibleContent>
              {!isCalendarCollapsed && <MobileCalendarGrid days={calendarDays} />}
            </CollapsibleContent>

            <div className="flex justify-between items-center pl-1 pr-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-2 -mt-2">
              <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <h2 className="font-bold text-lg">{format(agendaDate, "MMMM d")}</h2>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {isCalendarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      <span className="sr-only">Toggle calendar</span>
                    </Button>
                  </div>
              </CollapsibleTrigger>
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenNewTodoDialog(agendaDate)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-2">
              <div className="pt-2">
                {todosForAgenda.length > 0 ? (
                    todosForAgenda.map(todo => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onSelect={() => {
                            const originalTodo = todos?.find(t => t.id === (todo.originalId || todo.id));
                            if (originalTodo) {
                              handleSelectTodo(originalTodo);
                            }
                          }}
                          onDrop={handleDropOnTodo}
                          isToday={isSameDay(agendaDate, new Date())}
                        />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground pt-8">
                        No todos for this day.
                    </div>
                )}
              </div>
            </div>
          </Collapsible>
        </div>


        {/* Desktop View: Full Grid Calendar */}
        <div className="hidden md:flex flex-col flex-1">
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
            {calendarDays
              .filter(day => getDay(day) >= 1 && getDay(day) <= 5)
              .map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const holiday = holidays.find(h => h.date === dayStr);
              const todosForDay = allTodosForCalendar
                .filter((todo) => isSameDay(new Date(todo.date), day))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              const isToday = isSameDay(day, new Date());
              return (
                <Card
                  key={day.toString()}
                  className={cn(
                    "transition-colors duration-200 hover:bg-accent/30 flex flex-col relative",
                    !isSameMonth(day, currentDate) && "bg-muted/50",
                    isToday && "bg-accent/50"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, day)}
                >
                  <CardContent className="p-2 flex-grow flex flex-col">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <time
                          dateTime={format(day, "yyyy-MM-dd")}
                          className={cn(
                            "font-semibold",
                            isToday && "text-accent-foreground",
                            (getDay(day) === 0 || holiday) && "holiday"
                          )}
                        >
                          {format(day, "d")}
                        </time>
                        {isToday && (
                          <Badge>
                            Today
                          </Badge>
                        )}
                        {holiday && (
                          <Badge variant="destructive" className="text-xs">
                            {holiday.name}
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
                          onSelect={() => {
                            const originalTodo = todos?.find(t => t.id === (todo.originalId || todo.id));
                            if (originalTodo) {
                              handleSelectTodo(originalTodo);
                            }
                          }}
                          onDrop={handleDropOnTodo}
                          isToday={isToday}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        <TodoDialog
          isOpen={isDialogOpen}
          setOpen={setDialogOpen}
          todo={selectedTodo}
          selectedDate={selectedDate}
        />
      </div>
    </TooltipProvider>
  );
}
