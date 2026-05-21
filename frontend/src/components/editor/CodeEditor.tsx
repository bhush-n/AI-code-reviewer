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

    // Custom theme: deeper background to match futuristic palette
    monaco.editor.defineTheme("ai-reviewer-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0A0A12",
        "editor.foreground": "#E5E5EE",
        "editorLineNumber.foreground": "#3A3A4A",
        "editorLineNumber.activeForeground": "#8B5CF6",
        "editor.selectionBackground": "#8B5CF640",
        "editor.lineHighlightBackground": "#16161F00",
        "editorCursor.foreground": "#8B5CF6",
        "editorIndentGuide.background1": "#1A1A28",
        "editorIndentGuide.activeBackground1": "#2A2A3C",
      },
    });
    monaco.editor.setTheme("ai-reviewer-dark");
  };

  useEffect(() => {
    ref.current?.updateOptions({ readOnly: !!readOnly });
  }, [readOnly]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={monacoLang}
        theme="ai-reviewer-dark"
        options={{
          minimap: { enabled: false },
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "none",
          fontLigatures: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        onMount={handleMount}
      />
    </div>
  );
}
