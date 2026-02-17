export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-8 shadow-soft">
        {children}
      </div>
    </div>
  );
}


