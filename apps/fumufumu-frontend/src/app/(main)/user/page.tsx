import { fetchCurrentUserApi } from "@/features/user/api/userApi";
import { fetchUserConsultationsApi } from "@/features/user/api/userConsultationApi";
import { UserContentTabs } from "@/features/user/components/UserContentTabs";
import { UserProfile } from "@/features/user/components/UserProfile";
import { UserSessionExpiredState } from "@/features/user/components/UserSessionExpiredState";

export const metadata = {
  title: "ユーザー情報 | Fumufumu App",
  description: "現在ログイン中のユーザー情報を表示します",
};

type UserPageProps = {
  searchParams?: Promise<{
    expired?: string;
  }>;
};

export default async function UserPage({ searchParams }: UserPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldForceSessionExpired = resolvedSearchParams?.expired === "1";
  const user = await fetchCurrentUserApi();

  if (shouldForceSessionExpired || user === null) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="sr-only">ユーザー情報</h1>
        <UserSessionExpiredState />
      </div>
    );
  }

  const consultationResponse = await fetchUserConsultationsApi(user.id);

  return (
    <div className="max-w-3xl mx-auto w-full">
      <h1 className="sr-only">ユーザープロフィール</h1>
      <UserProfile user={user} />
      <section aria-labelledby="user-content-heading">
        <h2 id="user-content-heading" className="sr-only">
          ユーザー投稿一覧
        </h2>
        <UserContentTabs consultations={consultationResponse.data} />
      </section>
    </div>
  );
}
