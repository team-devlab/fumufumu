import type {
  Consultation,
  PaginationMeta,
} from "@/features/consultation/types";
import { ModerationActions } from "./ModerationActions";
import { ModerationPagination } from "./ModerationPagination";
import { PendingItemCard } from "./PendingItemCard";

/**
 * 公開中の相談セクション (Server Component, ADR 011 §5.1)
 *
 * PendingConsultationList と対称の構造。hide操作は ModerationActions に委譲する。
 */
type Props =
  | {
      status: "success";
      items: Consultation[];
      pagination: PaginationMeta;
      baseHref: string;
    }
  | {
      status: "error";
      message: string;
    };

export const PublishedConsultationList = (props: Props) => {
  const count =
    props.status === "success" ? props.pagination.total_items : null;

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
          公開中の相談はありません
        </p>
      )}

      {props.status === "success" && props.items.length > 0 && (
        <ul className="space-y-3">
          {props.items.map((item) => (
            <li key={item.id}>
              <PendingItemCard
                id={item.id}
                title={item.title}
                body={item.body_preview}
                authorId={item.author?.id ?? null}
                authorName={item.author?.name}
                createdAt={item.created_at}
                actions={
                  <ModerationActions
                    mode="hide"
                    targetType="consultations"
                    targetId={item.id}
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}

      {props.status === "success" && (
        <ModerationPagination
          pagination={props.pagination}
          baseHref={props.baseHref}
        />
      )}
    </section>
  );
};
