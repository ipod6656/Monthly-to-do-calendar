"use client";

import type { Todo } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useTransition } from "react";
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
import { Trash2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const todoSchema = z.object({
  title: z.string().min(1, "제목은 필수 항목입니다."),
  date: z.string().min(1, "날짜는 필수 항목입니다."),
  importance: z.enum(["High", "Medium", "Low"]),
  completed: z.boolean().default(false),
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
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (todo) {
            form.reset({
                ...todo,
                date: format(new Date(todo.date), "yyyy-MM-dd"),
            });
        } else if (selectedDate) {
            form.reset({
                title: "",
                date: format(selectedDate, "yyyy-MM-dd"),
                importance: "Medium",
                completed: false,
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
      <DialogContent className="sm:max-w-[425px]">
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
                    <Input placeholder="예: 프로젝트 제안서 완료" {...field} />
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
                        완료로 표시
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="sm:justify-between pt-4">
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
                      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={isPending} className={!todo ? "w-full" : ""}>
                {isPending ? "저장 중..." : (todo ? "변경 내용 저장" : "할 일 만들기")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
