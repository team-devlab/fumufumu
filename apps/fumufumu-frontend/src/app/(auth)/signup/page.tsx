import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { pickFirst } from "@/lib/searchParams";

export const metadata: Metadata = {
  title: "サインアップ | Fumufumu App",
  description: "新しいアカウントを作成します",
};

type PageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return <SignupForm returnTo={pickFirst(resolvedSearchParams.returnTo)} />;
}
