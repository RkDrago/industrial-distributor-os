import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/auth";

export const metadata = {
  title: "Operations dashboard",
  robots: { index: false, follow: false },
};

/**
 * The middleware already turned away unauthenticated requests; this second
 * check means the dashboard still cannot render if the cookie becomes invalid
 * between those two points.
 */
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminShell email={session.email}>{children}</AdminShell>;
}
