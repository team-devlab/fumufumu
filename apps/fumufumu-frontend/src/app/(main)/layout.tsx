import { TemporaryHeader } from "./_components/TemporaryHeader";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col h-screen">
      <TemporaryHeader />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
