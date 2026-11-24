import { EditorPanel } from '#/components/execute/editor-panel/index.tsx'
import { ConsolePanel } from '#/components/execute/panels/console-panel.tsx'
import { ProblemPanel } from '#/components/execute/panels/problem-panel.tsx'
import Topbar from '#/components/execute/topbar.tsx'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '#/components/ui/resizable.tsx'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/execute')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="w-full h-[100dvh] overflow-hidden">
      <Topbar />
      <Outlet />
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        {/* Left: problem / instructions */}
        <ResizablePanel defaultSize="35%" minSize="20%" maxSize="50%">
          <ProblemPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: editor on top, console below */}
        <ResizablePanel defaultSize="65%" minSize="40%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="65%" minSize="30%">
              <EditorPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="35%" minSize="10%" maxSize="60%">
              <ConsolePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
