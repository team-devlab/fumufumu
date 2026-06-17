import type { PendingAdviceDetail } from "../types";
import { PendingItemCard } from "./PendingItemCard";

/**
 * pending アドバイスのセクション (Server Component)
 *
 * 構造は PendingConsultationList と対称。所属相談のタイトル取得は API 拡張待ちのため、
 * consultation_id のみカード末尾に表示する (docs/projects/08 §4.3)。
 */
type Props =
  | {
      status: "success";
      items: PendingAdviceDetail[];
    }
  | {
      status: "error";
      message: string;
    };

export const PendingAdviceList = (props: Props) => {
  const count = props.status === "success" ? props.items.length : null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-2">
        <h2 className="text-lg font-bold text-gray-900">アドバイス</h2>
        {count !== null && (
          <span className="text-sm text-gray-500">（{count} 件）</span>
        )}
      </header>

      {props.status === "error" && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          <p>アドバイスの取得に失敗しました</p>
          <p className="mt-1 text-xs text-red-500">{props.message}</p>
        </div>
      )}

      {props.status === "success" && props.items.length === 0 && (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          チェック待ちのアドバイスはありません
        </p>
      )}

      {props.status === "success" && props.items.length > 0 && (
        <ul className="space-y-3">
          {props.items.map((item) => (
            <li key={item.id}>
              <PendingItemCard
                id={item.id}
                body={item.body}
                authorId={item.author_id}
                createdAt={item.created_at}
                meta={
                  <span>
                    所属相談:{" "}
                    <a
                      href={`/consultations/${item.consultation_id}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-teal-600 underline hover:text-teal-800"
                    >
                      #{item.consultation_id}
                    </a>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
