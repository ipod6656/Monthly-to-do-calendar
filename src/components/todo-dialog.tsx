"use client";

import type { Todo } from "@/lib/types";
import {
  createTodoAction,
  deleteTodoAction,
  updateTodoAction,
} from "@/lib/actions";
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

const todoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
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
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      const action = todo
        ? updateTodoAction(todo.id, formData)
        : createTodoAction(formData);

      const result = await action;

      if (result?.success) {
        toast({ title: `Todo ${todo ? "updated" : "created"} successfully!` });
        setOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: "Failed to save the todo. Please try again.",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!todo) return;
    startTransition(async () => {
      const result = await deleteTodoAction(todo.id);
      if (result.success) {
        toast({ title: "Todo deleted successfully!" });
        setOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: "Failed to delete the todo. Please try again.",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{todo ? "Edit Todo" : "Add Todo"}</DialogTitle>
          <DialogDescription>
            {todo
              ? "Update the details of your task."
              : "Create a new task for your calendar."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Finish project proposal" {...field} />
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
                  <FormLabel>Date</FormLabel>
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
                  <FormLabel>Importance</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select importance" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
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
                        Mark as completed
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
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this todo item.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={isPending} className={!todo ? "w-full" : ""}>
                {isPending ? "Saving..." : (todo ? "Save Changes" : "Create Todo")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
