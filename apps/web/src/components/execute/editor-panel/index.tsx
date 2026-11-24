'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FALLBACK_LANGUAGES, type ExecLanguage } from '@/lib/execute/languages'

import { CodeEditor } from './code-editor'
import { LanguageSelect } from './language-select'

const FONT_SIZES = {
  small: 16,
  medium: 18,
  large: 22,
} as const

type FontSizeKey = keyof typeof FONT_SIZES

export function EditorPanel({
  languages = FALLBACK_LANGUAGES,
}: {
  languages?: ExecLanguage[]
}) {
  const [languageId, setLanguageId] = useState(languages[0].id)
  // One draft per language, so switching never wipes the student's code.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [fontSize, setFontSize] = useState<FontSizeKey>('medium')

  const language = languages.find((l) => l.id === languageId) ?? languages[0]
  const code = drafts[language.id] ?? language.starterCode ?? ''

  // Reset = drop the draft for the current language, so it falls back to starter code.
  const handleReset = () =>
    setDrafts((d) => {
      const { [language.id]: _removed, ...rest } = d
      return rest
    })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        {/* Left: language + font size */}
        <div className="flex items-center gap-2">
          <LanguageSelect
            languages={languages}
            value={language.id}
            onChange={setLanguageId}
          />
          <NativeSelect
            size="sm"
            className="w-28"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as FontSizeKey)}
            aria-label="Font size"
          >
            <NativeSelectOption value="small">Small</NativeSelectOption>
            <NativeSelectOption value="medium">Medium</NativeSelectOption>
            <NativeSelectOption value="large">Large</NativeSelectOption>
          </NativeSelect>
        </div>

        {/* Right: reset */}
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <CodeEditor
          language={language.monaco}
          value={code}
          fontSize={FONT_SIZES[fontSize]}
          onChange={(v) => setDrafts((d) => ({ ...d, [language.id]: v }))}
        />
      </div>
    </div>
  )
}
