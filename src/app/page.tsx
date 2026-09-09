import { redirect } from "next/navigation";

// The original app always lands back on the Main Dashboard after
// login (see the hadSessionRef effect in the old App.tsx) — "/" simply
// forwards there. The (app) layout below is what actually decides
// whether the visitor gets the dashboard or gets bounced to /login.
export default function RootPage() {
  redirect("/dashboard");
}
