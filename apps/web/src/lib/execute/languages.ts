export type ExecLanguage = {
  id: string; // your platform key, e.g. "python"
  label: string; // shown in the select
  monaco: string; // Monaco language id
  judge0Id?: number; // used by the backend, not needed in the UI
  starterCode?: string;
};

// Temporary fallback until the API returns the platform allowlist.
export const FALLBACK_LANGUAGES: ExecLanguage[] = [
  {
    id: "c",
    label: "C",
    monaco: "c",
    starterCode: "#include <stdio.h>\n\nint main() {\n    return 0;\n}\n",
  },
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    starterCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    starterCode:
      "public class Main {\n    public static void main(String[] args) {\n    }\n}\n",
  },
  {
    id: "python",
    label: "Python",
    monaco: "python",
    starterCode: "# write your solution here\n",
  },
];
