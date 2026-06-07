import type { PendingConsultationDetail } from "../types";
import { PendingItemCard } from "./PendingItemCard";

/**
 * pending 相談のセクション (Server Component)
 *
 * page.tsx 側で Promise.allSettled の結果を unwrap し、成功 / 失敗を本 component に渡す。
 * これにより、アドバイス側が失敗しても本セクションは正常に表示できる (docs/projects/08 §5.3)。
 */
type Props =
  | {
      status: "success";
      items: PendingConsultationDetail[];
    }
  | {
      status: "error";
      message: string;
    };

export const PendingConsultationList = (props: Props) => {
  const count = props.status === "success" ? props.items.length : null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-2">
        <h2 className="text-lg font-bold text-gray-900">相談</h2>
        {count !== null && (
          <span className="text-sm text-gray-500">（{count} 件）</span>
        )}
      </header>

      {props.status === "error" && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          <p>相談の取得に失敗しました</p>
          <p className="mt-1 text-xs text-red-500">{props.message}</p>
        </div>
      )}

      {props.status === "success" && props.items.length === 0 && (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          チェック待ちの相談はありません
        </p>
      )}

      {props.status === "success" && props.items.length > 0 && (
        <ul className="space-y-3">
          {props.items.map((item) => (
            <li key={item.id}>
              <PendingItemCard
                id={item.id}
                title={item.title}
                body={item.body}
                authorId={item.author_id}
                createdAt={item.created_at}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
