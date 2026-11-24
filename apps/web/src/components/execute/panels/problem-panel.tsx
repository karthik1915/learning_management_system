"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProblemPanel() {
  return (
    <Tabs defaultValue="description" className="flex h-full flex-col gap-0">
      <TabsList className="m-2 w-fit shrink-0">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="submissions">Submissions</TabsTrigger>
      </TabsList>

      <TabsContent
        value="description"
        className="min-h-0 flex-1 overflow-auto p-4"
      >
        {/* TODO: title, statement, constraints, sample cases from context */}
        <p className="text-muted-foreground">Problem description</p>
      </TabsContent>

      <TabsContent
        value="submissions"
        className="min-h-0 flex-1 overflow-auto p-4"
      >
        {/* TODO: this student's attempt history for this problem */}
        <p className="text-muted-foreground">Submission history</p>
      </TabsContent>
    </Tabs>
  );
}
