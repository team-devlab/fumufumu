import { fetchUserAdvicesApi } from "@/features/user/api/userAdviceApi";
import { fetchCurrentUserApi } from "@/features/user/api/userApi";
import { fetchUserConsultationsApi } from "@/features/user/api/userConsultationApi";
import {
  type AdviceTabState,
  UserContentTabs,
} from "@/features/user/components/UserContentTabs";
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
        <div className="p-6 bg-white rounded-xl shadow border border-gray-200 text-center">
          <h1 className="sr-only">ユーザー情報</h1>
          <p className="text-gray-600">ユーザー情報の取得に失敗しました。</p>
        </div>
      </div>
    );
  }

  // 相談は主要情報のため従来どおり取得失敗で画面全体をエラーにする。
  // アドバイスは副次情報なので、失敗してもプロフィール本体・相談タブを巻き添えにせず、
  // アドバイスタブ内のエラー表示に縮退させる (取得は相談と並行する)。
  const [consultationResponse, adviceState] = await Promise.all([
    fetchUserConsultationsApi(user.id),
    fetchUserAdvicesApi(user.id)
      .then(
        (response) =>
          ({ status: "success", advices: response.data }) as AdviceTabState,
      )
      .catch((error) => {
        // 縮退すると成功時と区別がつかず障害調査で見落とすため、この経路のログを残す。
        console.error("Failed to fetch advices for user profile:", error);
        return { status: "error" } as AdviceTabState;
      }),
  ]);

  return (
    <div className="max-w-3xl mx-auto w-full">
      <h1 className="sr-only">ユーザープロフィール</h1>
      <UserProfile user={user} />
      <section aria-labelledby="user-content-heading">
        <h2 id="user-content-heading" className="sr-only">
          ユーザー投稿一覧
        </h2>
        <UserContentTabs
          consultations={consultationResponse.data}
          adviceState={adviceState}
        />
      </section>
    </div>
  );
}
