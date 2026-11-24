'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ConsolePanel() {
  return (
    <Tabs defaultValue="testcases" className="flex h-full flex-col gap-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1">
        <TabsList>
          <TabsTrigger value="testcases">Testcases</TabsTrigger>
          <TabsTrigger value="result">Result</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg">
            Run
          </Button>
          <Button size="lg">Submit</Button>
        </div>
      </div>

      <TabsContent
        value="testcases"
        className="min-h-0 flex-1 overflow-auto p-3"
      >
        {/* TODO: visible sample cases (input / expected) */}
        <p className="text-sm text-muted-foreground">Testcases</p>
      </TabsContent>

      <TabsContent value="result" className="min-h-0 flex-1 overflow-auto p-3">
        {/* TODO: status, per-case output, score, time and memory */}
        <p className="text-sm text-muted-foreground">Run / submit result</p>
      </TabsContent>
    </Tabs>
  )
}
