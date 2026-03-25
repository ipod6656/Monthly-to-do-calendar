
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
  Bot,
  ListTodo,
} from "lucide-react";
import { useMemo, useState, useTransition, useRef, useEffect, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TodoDialog } from "@/components/todo-dialog";
import { TodoItem } from "@/components/todo-item";
import { AiSummaryDialog } from "@/components/ai-summary-dialog";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { fetchHolidays, getHolidays } from "@/lib/holidays";

export function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isExporting, startExportTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isCalendarCollapsed, setCalendarCollapsed] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holidays, setHolidays] = useState<{date: string, name: string}[]>([]);

  // Sync Holidays from API
  useEffect(() => {
    const year = currentDate.getFullYear();
    fetchHolidays(year).then(setHolidays);
  }, [currentDate]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    e.dataTransfer.dropEffect = 'move';
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
  
    return recurringTodosExpanded;
  }, [todos, currentDate]);

  // Filtered todos for calendar display (current month + search)
  const filteredTodosForCalendar = useMemo(() => {
    if (!searchQuery) return allTodosForCalendar;
    return allTodosForCalendar.filter((todo) =>
      todo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allTodosForCalendar, searchQuery]);

  // Search results across ALL todos (not just current month)
  const searchResults = useMemo(() => {
    if (!searchQuery || !todos) return [];
    const q = searchQuery.toLowerCase();
    // Search non-recurring todos directly
    const results = todos
      .filter(todo => !todo.isRecurring && todo.title.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
    return results;
  }, [todos, searchQuery]);

  const handleSearchSelect = (todo: Todo) => {
    const todoDate = parseISO(todo.date);
    setCurrentDate(todoDate);
    setSearchQuery('');
    setIsSearchFocused(false);
    
    // Highlight the date for 3 seconds
    const dateStr = todo.date;
    setHighlightedDate(dateStr);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedDate(null), 3000);
  };

  const incompleteTodos = useMemo(() => {
    return filteredTodosForCalendar
      .filter((todo) => !todo.completed && !todo.isRecurring)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTodosForCalendar]);

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
    return filteredTodosForCalendar
      .filter((todo) => isSameDay(new Date(todo.date), agendaDate))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [filteredTodosForCalendar, agendaDate]);

  const MobileCalendarGrid = ({ days }: { days: Date[] }) => (
    <div className="grid grid-cols-7 gap-y-2">
      {days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const holiday = holidays.find(h => h.date === dayStr);
        const todosForDay = filteredTodosForCalendar.filter(todo => isSameDay(new Date(todo.date), day));
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
        <header className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5 select-none">
              <h1 className="text-xl font-black font-headline text-slate-700 tracking-tighter leading-none">
                Monthly to-do
              </h1>
              <h2 className="text-lg font-bold font-headline text-slate-400 leading-none">
                Calendar
              </h2>
            </div>
            
            <div className="flex items-center bg-white/60 p-1 rounded-xl border border-slate-200 shadow-sm backdrop-blur-sm">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 text-slate-500 hover:bg-white hover:shadow-sm transition-all rounded-lg">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="px-5 text-center min-w-[140px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">{format(currentDate, "yyyy")}</div>
                <div className="text-lg font-bold text-slate-700 leading-none">{format(currentDate, "MMMM")}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 text-slate-500 hover:bg-white hover:shadow-sm transition-all rounded-lg">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="mx-1.5 h-4 w-[1px] bg-slate-200" />
              <Button variant="ghost" onClick={goToToday} className="h-9 px-3 text-xs font-bold text-indigo-600 hover:bg-white hover:shadow-sm transition-all rounded-lg">
                TODAY
              </Button>
            </div>
          </div>

          <div id="mega-search-container" ref={searchContainerRef} className="flex-1 max-w-xl min-w-[200px] relative h-11">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none z-20 text-slate-400"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="mega-search-input"
              type="text"
              placeholder="할일 검색..."
              className="pl-12 w-full h-full bg-white border border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 shadow-sm rounded-xl text-sm font-bold z-10 focus:outline-none transition-all placeholder:text-slate-400"
              style={{ caretColor: 'black' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            {isSearchFocused && searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-[320px] overflow-y-auto">
                <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4">검색 결과 ({searchResults.length})</div>
                {searchResults.map(todo => {
                  const d = parseISO(todo.date);
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                  const dateLabel = `${format(d, 'yyyy년 M월 d일')} (${dayNames[d.getDay()]})`;
                  return (
                    <button
                      key={todo.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center gap-3 group border-b border-slate-100 last:border-b-0"
                      onClick={() => handleSearchSelect(todo)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-semibold truncate",
                          todo.completed ? "line-through text-slate-400" : "text-slate-800",
                          todo.importance === 'High' && !todo.completed && 'text-red-500'
                        )}>
                          {todo.title}
                        </div>
                        <div className="text-[11px] text-indigo-500 font-medium mt-0.5">{dateLabel}</div>
                      </div>
                      {todo.completed && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">완료</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {isSearchFocused && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-6 text-center">
                <span className="text-2xl mb-2 block">🔍</span>
                <span className="text-sm text-slate-500">'{searchQuery}'에 대한 검색 결과가 없습니다.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setAiDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold border-0 shadow-md flex items-center h-10 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Bot className="h-4 w-4 mr-2" />
              <span>AI 브리핑</span>
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4 rounded-xl font-bold transition-all">
                  <ListTodo className="h-4 w-4 mr-2" />
                  <span>모아보기</span>
                  {incompleteTodos.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] border-2 border-white animate-in zoom-in font-bold">
                      {incompleteTodos.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:max-w-md flex flex-col gap-4 bg-slate-50/95 backdrop-blur-md p-0 overflow-hidden border-l border-slate-200 shadow-2xl">
                <SheetHeader className="p-6 pb-2">
                  <SheetTitle className="flex items-center gap-2 text-xl font-bold font-headline select-none">
                    <ListTodo className="h-6 w-6 text-indigo-500" />
                    미완료 할 일 총정리
                  </SheetTitle>
                </SheetHeader>
                <div className="relative flex-1 overflow-hidden">
                  <ScrollArea className="h-full px-6" ref={(node: any) => {
                    if (!node) return;
                    const viewport = node.querySelector('[data-radix-scroll-area-viewport]');
                    if (!viewport) return;
                    const checkScroll = () => {
                      const hint = node.parentElement?.querySelector('[data-scroll-hint]') as HTMLElement | null;
                      if (!hint) return;
                      const isScrollable = viewport.scrollHeight > viewport.clientHeight + 20;
                      const isNearBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 30;
                      hint.style.opacity = (isScrollable && !isNearBottom) ? '1' : '0';
                      hint.style.pointerEvents = (isScrollable && !isNearBottom) ? 'auto' : 'none';
                    };
                    viewport.addEventListener('scroll', checkScroll);
                    const observer = new MutationObserver(checkScroll);
                    observer.observe(viewport, { childList: true, subtree: true });
                    setTimeout(checkScroll, 100);
                  }}>
                    <div className="space-y-3 pb-8">
                      {incompleteTodos.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                          <span className="text-4xl mb-3">🎉</span>
                          이번 달 달력의 모든 할 일을 마쳤습니다!<br/>완벽해요.
                        </div>
                      ) : (
                        incompleteTodos.map(todo => {
                          const parsedDate = parseISO(todo.date);
                          const kDateStr = `${format(parsedDate, "yyyy년 M월 d일")} (${["일", "월", "화", "수", "목", "금", "토"][parsedDate.getDay()]})`;
                          return (
                            <div key={todo.id} className="relative group flex flex-col gap-1">
                              <div className="text-[12px] font-semibold text-indigo-500 bg-indigo-50/50 inline-block px-2.5 py-0.5 rounded-full self-start mt-3 mb-0.5 border border-indigo-100 shadow-sm">
                                {kDateStr}
                              </div>
                              <TodoItem
                                todo={todo}
                                onSelect={() => handleSelectTodo(todo)}
                                onDrop={handleDropOnTodo}
                                isToday={isSameDay(parsedDate, new Date())}
                                hideDragHandle={true}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  <div data-scroll-hint className="absolute bottom-6 left-0 right-0 flex justify-center transition-opacity duration-300 z-50 pointer-events-none" style={{ opacity: 0 }}>
                    <div className="bg-indigo-600 text-white border border-indigo-500 shadow-lg rounded-full px-4 py-1.5 flex items-center space-x-2 animate-bounce text-xs font-bold">
                      <span>아래에 더 많은 할 일이 있어요</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button onClick={handleExport} disabled={isExporting} variant="secondary" className="hidden lg:flex bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 h-10 rounded-xl font-bold transition-all">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              <span>CSV 내보내기</span>
            </Button>

            <div className="flex items-center gap-1.5 ml-1">
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleLogout} variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">로그아웃</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">로그아웃</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isDeleting} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                        <Trash2 className="h-5 w-5" />
                         <span className="sr-only">회원 탈퇴</span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">회원 탈퇴</p>
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
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      탈퇴하기
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
              const todosForDay = filteredTodosForCalendar
                .filter((todo) => isSameDay(new Date(todo.date), day))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              const isToday = isSameDay(day, new Date());
              return (
                <Card
                  key={day.toString()}
                  className={cn(
                    "transition-all duration-300 hover:bg-accent/30 flex flex-col relative",
                    !isSameMonth(day, currentDate) && "bg-muted/50",
                    isToday && "bg-accent/50",
                    highlightedDate === dayStr && "ring-2 ring-indigo-400 bg-indigo-50/60 shadow-lg shadow-indigo-100 animate-pulse"
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
        <AiSummaryDialog
          todos={todos || []}
          isOpen={isAiDialogOpen}
          setOpen={setAiDialogOpen}
        />
      </div>
    </TooltipProvider>
  );
}
