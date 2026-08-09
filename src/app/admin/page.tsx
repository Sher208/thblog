import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getServerSession } from "@/lib/session";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
