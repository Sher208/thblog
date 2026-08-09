import { Suspense } from "react";
import AdminLoginPage from "./page-client";

export const metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <AdminLoginPage />
    </Suspense>
  );
}
