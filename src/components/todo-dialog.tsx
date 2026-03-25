
"use client";

import type { Todo } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useTransition, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, ChevronDown } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Textarea } from "@/components/ui/textarea";

const todoSchema = z.object({
  title: z.string().min(1, "제목은 필수 항목입니다."),
  date: z.string().min(1, "날짜는 필수 항목입니다."),
  importance: z.enum(["High", "Medium", "Low"]),
  completed: z.boolean().default(false),
  order: z.number().default(Date.now),
  isRecurring: z.boolean().default(false),
  isReminderActive: z.boolean().default(false),
  repeatIntervalDays: z.coerce.number().nullable().optional(),
  reminderDate: z.string().nullable().optional(),
  reminderEndDate: z.string().nullable().optional(),
});

type TodoFormData = z.infer<typeof todoSchema>;

interface TodoDialogProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  todo: Todo | null;
  selectedDate: Date | null;
}

export function TodoDialog({
  isOpen,
  setOpen,
  todo,
  selectedDate,
}: TodoDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
      date: "",
      importance: "Medium",
      completed: false,
      order: Date.now(),
      isRecurring: false,
      isReminderActive: false,
      repeatIntervalDays: null,
      reminderDate: null,
      reminderEndDate: null,
    },
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const checkScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      setShowScrollHint(scrollHeight > clientHeight + 5 && scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkScroll, 100);
      return () => clearTimeout(timer);
    } else {
      setShowScrollHint(false);
    }
  }, [isOpen, form.watch("isReminderActive"), form.watch("repeatIntervalDays")]);

  useEffect(() => {
    if (isOpen) {
        if (todo) {
            form.reset({
                ...todo,
                date: format(new Date(todo.date), "yyyy-MM-dd"),
                isReminderActive: todo.isReminderActive ?? false,
                repeatIntervalDays: todo.repeatIntervalDays ?? null,
                reminderDate: todo.reminderDate ?? null,
                reminderEndDate: todo.reminderEndDate ?? null,
            });
        } else if (selectedDate) {
            form.reset({
                title: "",
                date: format(selectedDate, "yyyy-MM-dd"),
                importance: "Medium",
                completed: false,
                order: Date.now(),
                isRecurring: false,
                isReminderActive: false,
                repeatIntervalDays: null,
                reminderDate: format(selectedDate, "yyyy-MM-dd"),
                reminderEndDate: null,
            });
        }
    }
  }, [isOpen, todo, selectedDate, form]);

  const onSubmit = (data: TodoFormData) => {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "오류가 발생했습니다",
            description: "사용자 정보 또는 데이터베이스 연결을 찾을 수 없습니다.",
        });
        return;
    }

    startTransition(() => {
        try {
            const todosCollection = collection(firestore, "users", user.uid, "todos");
            if (todo) {
                // Update existing todo
                const todoRef = doc(todosCollection, todo.id);
                updateDocumentNonBlocking(todoRef, {
                    ...data,
                    updatedAt: serverTimestamp(),
                });
                toast({ title: "할 일이 수정되었습니다!" });
            } else {
                // Create new todo
                addDocumentNonBlocking(todosCollection, {
                    ...data,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: "할 일이 생성되었습니다!" });
            }
            setOpen(false);
        } catch (error) {
            console.error("Error saving todo: ", error);
            toast({
                variant: "destructive",
                title: "오류가 발생했습니다",
                description: "할 일을 저장하지 못했습니다. 다시 시도해주세요.",
            });
        }
    });
  };

  const handleDelete = () => {
    if (!todo || !user || !firestore) return;
    
    startTransition(() => {
        try {
            const todoRef = doc(firestore, "users", user.uid, "todos", todo.id);
            deleteDocumentNonBlocking(todoRef);
            toast({ title: "할 일이 삭제되었습니다!" });
            setOpen(false);
        } catch (error) {
            console.error("Error deleting todo: ", error);
            toast({
                variant: "destructive",
                title: "오류가 발생했습니다",
                description: "할 일을 삭제하지 못했습니다. 다시 시도해주세요.",
            });
        }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto relative"
        onScroll={checkScroll}
        ref={contentRef}
      >
        <DialogHeader>
          <DialogTitle>{todo ? "할 일 수정" : "할 일 추가"}</DialogTitle>
          <DialogDescription>
            {todo
              ? "할 일의 세부 정보를 업데이트하세요."
              : "캘린더에 새로운 할 일을 만드세요."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목</FormLabel>
                  <FormControl>
                    <Textarea placeholder="예: 프로젝트 제안서 완료" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>날짜</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="importance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>중요도</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="중요도 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="High">높음</SelectItem>
                      <SelectItem value="Medium">중간</SelectItem>
                      <SelectItem value="Low">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="flex items-center space-x-2">
                <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>
                            매월 반복
                        </FormLabel>
                        </div>
                    </FormItem>
                    )}
                />
                {todo && (
                <FormField
                    control={form.control}
                    name="completed"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>
                            완료으로 표시
                        </FormLabel>
                        </div>
                    </FormItem>
                    )}
                />
                )}
            </div>

            <div className="flex flex-col space-y-3 rounded-md border p-4 bg-slate-50">
                <FormField
                    control={form.control}
                    name="isReminderActive"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold text-sm">이메일 리마인더 알림</FormLabel>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          이 할 일을 "완료"로 체크하기 전까지 계속 알람을 줍니다.
                        </p>
                        </div>
                    </FormItem>
                    )}
                />
                
                {form.watch("isReminderActive") && (
                <div className="space-y-3 pt-2 border-t mt-2 border-slate-200">
                    <FormField
                        control={form.control}
                        name="reminderDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">첫 알림 발송 날짜 (단 1회 시 이 날짜만 발송)</FormLabel>
                            <FormControl>
                                <Input type="date" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="repeatIntervalDays"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">알림 반복 주기</FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                                value={field.value ? String(field.value) : "null"}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="알람 형태 선택" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="null">단 1회 (설정한 날짜에만 통보)</SelectItem>
                                <SelectItem value="1">매일 (완료할 때까지 매일 반복)</SelectItem>
                                <SelectItem value="3">3일마다 (완료할 때까지 반복)</SelectItem>
                                <SelectItem value="7">7일마다 매주 (완료할 때까지 반복)</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                        )}
                    />
                    
                    {form.watch("repeatIntervalDays") !== null && (
                    <FormField
                        control={form.control}
                        name="reminderEndDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">마지막 알림 종료일 (선택 시 이 날짜까지만 발송)</FormLabel>
                            <FormControl>
                                <Input type="date" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    )}
                </div>
                )}
            </div>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button type="submit" disabled={isPending} className="flex-1 sm:flex-none">
                {isPending ? "저장 중..." : (todo ? "변경 내용 저장" : "할 일 만들기")}
              </Button>
              {todo && (
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isPending}>
                        <Trash2 className="mr-2 h-4 w-4" /> 삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 작업은 되돌릴 수 없습니다. 이 할 일이 영구적으로 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DialogFooter>
          </form>
        </Form>
        {showScrollHint && (
          <div className="sticky bottom-0 -mb-2 pb-2 mt-4 flex justify-center pointer-events-none z-50">
            <div className="bg-slate-100/40 text-slate-600 border border-slate-200/50 shadow-sm rounded-full px-3 py-1 flex items-center space-x-1 animate-bounce text-xs font-semibold backdrop-blur-sm">
              <span>스크롤을 내려주세요</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
