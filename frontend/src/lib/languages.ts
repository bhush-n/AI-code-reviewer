export interface Language {
  label: string;
  monaco: string;
  dotColor: string;
}

export const LANGUAGES: Language[] = [
  { label: "Python", monaco: "python", dotColor: "bg-yellow-400" },
  { label: "JavaScript", monaco: "javascript", dotColor: "bg-amber-400" },
  { label: "TypeScript", monaco: "typescript", dotColor: "bg-blue-400" },
  { label: "Django", monaco: "python", dotColor: "bg-green-500" },
];

export function getLanguage(label: string): Language {
  return LANGUAGES.find((l) => l.label === label) ?? LANGUAGES[0];
}
