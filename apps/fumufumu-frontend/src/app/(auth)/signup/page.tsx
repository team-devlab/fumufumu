import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/SignupForm";

export const metadata: Metadata = {
  title: "サインアップ | Fumufumu App",
  description: "新しいアカウントを作成します",
};

type PageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

const pickFirst = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <SignupForm returnTo={pickFirst(resolvedSearchParams.returnTo)} />;
}
