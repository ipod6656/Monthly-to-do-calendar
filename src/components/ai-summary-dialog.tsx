"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTransition, useState } from "react";
import { Loader2, Bot } from "lucide-react";
import type { Todo } from "@/lib/types";
import { summarizeTodosFlow } from "@/ai/flows/summarize-todos";

export function AiSummaryDialog({ todos, isOpen, setOpen }: { todos: Todo[], isOpen: boolean, setOpen: (open: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = () => {
    startTransition(async () => {
      try {
        const pendingTodos = todos
          .filter(t => !t.completed)
          .map(t => ({ 
            title: t.title, 
            description: t.description, 
            importance: t.importance as "High" | "Medium" | "Low", 
            date: t.date 
          }));
        
        const result = await summarizeTodosFlow({ todos: pendingTodos });
        setSummary(result.summary);
      } catch (e) {
        console.error("AI summarizer error:", e);
        setSummary("AI 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <Bot className="h-5 w-5 text-indigo-500" /> AI 비서의 오늘의 요약 브리핑
          </DialogTitle>
          <DialogDescription>
            남은 일정들을 분석해서 가장 집중해야 할 중요한 일들을 파악해 드릴게요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!summary && !isPending && (
            <div className="text-center py-6 text-muted-foreground">
              <Button onClick={handleSummarize} className="w-full shadow-md font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0">
                ✨ 내 할 일 리스트 분석하기
              </Button>
            </div>
          )}
          
          {isPending && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-foreground animate-pulse font-medium">인공지능 비서가 전체 캘린더 일정을 분석하고 있습니다...</p>
            </div>
          )}

          {summary && !isPending && (
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 p-5 rounded-lg shadow-inner text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">
              {summary}
            </div>
          )}
        </div>
        
        {summary && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSummary(null)}>새로고침 (다시 요약하기)</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
