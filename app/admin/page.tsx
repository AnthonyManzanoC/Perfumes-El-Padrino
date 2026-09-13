import { AdminDashboard } from '@/components/admin-dashboard';
export const metadata = { robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminDashboard />;
}
