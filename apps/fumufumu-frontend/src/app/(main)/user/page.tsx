import Link from "next/link";
import { fetchCurrentUserApi } from "@/features/user/api/userApi";
import { fetchUserConsultationsApi } from "@/features/user/api/userConsultationApi";
import { UserContentTabs } from "@/features/user/components/UserContentTabs";
import { UserProfile } from "@/features/user/components/UserProfile";

export const metadata = {
  title: "ユーザー情報 | Fumufumu App",
  description: "現在ログイン中のユーザー情報を表示します",
};

export default async function UserPage() {
  const user = await fetchCurrentUserApi();

  if (user === null) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="p-6 bg-white rounded-xl shadow border border-gray-200">
          <h1 className="sr-only">ユーザー情報</h1>
          <p className="text-gray-600 mb-4">
            ログインすると現在のユーザー情報を表示できます。
          </p>
          <Link href="/login" className="text-blue-600 hover:underline">
            ログインへ
          </Link>
        </div>
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
