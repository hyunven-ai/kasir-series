import AdminLayout from '@/components/layout/AdminLayout';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
