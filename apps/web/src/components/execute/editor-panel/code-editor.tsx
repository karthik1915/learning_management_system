'use client'

import { Skeleton } from '@/components/ui/skeleton'
import Editor, { type OnMount } from '@monaco-editor/react'

type Props = {
  language: string // Monaco language id
  value: string
  fontSize: number
  onChange: (value: string) => void
  onMount?: OnMount
  readOnly?: boolean
}

export function CodeEditor({
  language,
  value,
  onChange,
  onMount,
  fontSize = 18,
  readOnly,
}: Props) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={'light'}
      onChange={(v) => onChange(v ?? '')}
      onMount={onMount}
      loading={<Skeleton className="h-full w-full rounded-none" />}
      options={{
        readOnly,
        automaticLayout: true, // required: panels resize without window resize events
        minimap: { enabled: false },
        fontSize: fontSize,
        tabSize: 4,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        fontLigatures: true,
        renderLineHighlight: 'line',
        smoothScrolling: true,
      }}
    />
  )
}
