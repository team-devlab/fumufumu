import {
  fetchUserAdviceDraftsApi,
  fetchUserAdvicesApi,
} from "@/features/user/api/userAdviceApi";
import { fetchCurrentUserApi } from "@/features/user/api/userApi";
import {
  fetchUserConsultationDraftsApi,
  fetchUserConsultationsApi,
} from "@/features/user/api/userConsultationApi";
import {
  type AdviceTabState,
  type DraftTabState,
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
  // アドバイス・下書きは副次情報なので、失敗してもプロフィール本体・相談タブを巻き添えに
  // せず、各タブ内のエラー表示に縮退させる (取得はすべて相談と並行する)。
  // 下書きは相談・アドバイスで別APIのため、ソース単位で個別に縮退させる。
  const [
    consultationResponse,
    adviceState,
    consultationDraftResult,
    adviceDraftResult,
  ] = await Promise.all([
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
    fetchUserConsultationDraftsApi()
      .then(
        (response) =>
          ({
            status: "success",
            items: response.data,
          }) as DraftTabState["consultations"],
      )
      .catch((error) => {
        console.error(
          "Failed to fetch consultation drafts for user profile:",
          error,
        );
        return { status: "error" } as DraftTabState["consultations"];
      }),
    fetchUserAdviceDraftsApi()
      .then(
        (response) =>
          ({
            status: "success",
            items: response.data,
          }) as DraftTabState["advices"],
      )
      .catch((error) => {
        console.error("Failed to fetch advice drafts for user profile:", error);
        return { status: "error" } as DraftTabState["advices"];
      }),
  ]);

  const draftState: DraftTabState = {
    consultations: consultationDraftResult,
    advices: adviceDraftResult,
  };

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
          draftState={draftState}
        />
      </section>
    </div>
  );
}
