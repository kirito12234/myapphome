import RoleGuard from "./_components/RoleGuard";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <div className="min-h-screen">{children}</div>
    </RoleGuard>
  );
}
