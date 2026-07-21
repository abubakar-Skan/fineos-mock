const PATHS = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z",
  parties: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 21c0-5 3-8 7-8s7 3 7 8Zm13.5 0c0-3-.8-5.3-2.2-7 1-.5 2.2-.8 3.7-.8 4 0 7 3 7 7.8Z",
  cases: "M2 6h8l2 2h10v12H2zm0-2h9l2 2h9v2H12l-2-2H2z",
  queues: "M3 5h3v3H3zm5 0h13v3H8zM3 11h3v3H3zm5 0h13v3H8zM3 17h3v3H3zm5 0h13v3H8z",
  tasks: "M7 3h10l2 4h3v14H2V7h3zm1 4h8l-1-2H9zm-2 5h12v2H6zm0 4h8v2H6z",
  library: "M5 2h14v18H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v9.2c.3-.1.7-.2 1-.2h12V4Zm0 12a1 1 0 0 0 0 2h12v-2Z",
  person: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3 22c0-5 3.8-8 9-8s9 3 9 8Z",
  record: "M3 3h18v18H3zm4 4v3h10V7zm0 6v4h6v-4z",
  external: "M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14ZM5 5h6v2H5v12h12v-6h2v8H3V5Z",
  theme: "M12 2a10 10 0 1 0 0 20Zm0 2v16a8 8 0 0 1 0-16Z",
  search: "M10 3a7 7 0 1 0 4.5 12.4L20 21l1-1-5.6-5.5A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z",
  status: "M4 4h16v16H4zm3 3v10h10V7zm2 2h6v2H9zm0 4h4v2H9z",
  check: "M4 12 9 17 20 6l-2-2-9 9-3-3z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "" }: { readonly name: IconName; readonly className?: string }) {
  return <svg className={`fx-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    <path d={PATHS[name]} fill="currentColor" />
  </svg>;
}
