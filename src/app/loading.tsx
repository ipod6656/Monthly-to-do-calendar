import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <main className="flex h-screen flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
      </header>
      <div className="grid flex-1 grid-cols-5 gap-2">
        {weekdays.map((day) => (
          <div key={day} className="rounded-lg bg-card p-2 text-center text-sm font-semibold">
            {day}
          </div>
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <Card key={i} className="min-h-[120px]">
            <CardContent className="p-2">
              <Skeleton className="h-4 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}