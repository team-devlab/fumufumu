import { Footer } from "@/components/common/Footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(135deg,#E9FBF8_0%,#F7FFF8_52%,#FFFBEA_100%)]">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
