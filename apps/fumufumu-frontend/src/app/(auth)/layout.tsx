export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#E9FBF8_0%,#F7FFF8_52%,#FFFBEA_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#D7F7F1]/70 blur-3xl" />
        <div className="absolute right-[-120px] top-[24%] h-72 w-72 rounded-full bg-[#EAF9FF]/55 blur-3xl" />
        <div className="absolute -bottom-24 right-[-80px] h-96 w-96 rounded-full bg-[#FFF4C9]/55 blur-3xl" />
      </div>
      <div className="relative w-full">{children}</div>
    </div>
  );
}
