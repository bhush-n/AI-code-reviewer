import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import { getLanguage } from "@/lib/languages";

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: string;
  readOnly?: boolean;
  onSubmit?: () => void;
}

export function CodeEditor({ value, onChange, language, readOnly, onSubmit }: Props) {
  const ref = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoLang = getLanguage(language).monaco;

  const handleMount: OnMount = (editor, monaco) => {
    ref.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit?.();
    });
  };

  useEffect(() => {
    ref.current?.updateOptions({ readOnly: !!readOnly });
  }, [readOnly]);

  return (
    <div className="h-full w-full bg-surface-2 rounded-md overflow-hidden border border-border">
      <Editor
        height="100%"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={monacoLang}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          padding: { top: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "none",
        }}
        onMount={handleMount}
      />
    </div>
  );
}
