"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import type { ExecLanguage } from "@/lib/execute/languages";

type Props = {
  languages: ExecLanguage[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function LanguageSelect({
  languages,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <NativeSelect
      size="sm"
      className="w-36"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Programming language"
    >
      {languages.map((l) => (
        <NativeSelectOption key={l.id} value={l.id}>
          {l.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
