export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#E9FBF8_0%,#F7FFF8_52%,#FFFBEA_100%)]">
      {children}
    </div>
  );
}
