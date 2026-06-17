/**
 * pending な相談 / アドバイスを 1 件表示するカード (Server Component)
 *
 * 相談用とアドバイス用で別 component にせず、表示する補助情報 (consultation へのリンク等)
 * を `meta` slot で受ける形にしている。これは将来 author や tag 情報が API 拡張で
 * 載ってきた際の差し替えを 1 箇所に閉じるため。
 *
 * author は API が author_id (number) しか返さないため、暫定で「ユーザー#{id}」表記。
 * 将来の API 拡張で author.name が取れるようになったら本 component を差し替える。
 * 詳細は docs/projects/08 §4.1 を参照。
 */
type Props = {
  /** 投稿の DB ID (相談 or アドバイスの id) */
  id: number;
  /** 相談タイトル。アドバイスでは undefined */
  title?: string;
  body: string;
  /** 投稿者の業務 user id。退会済み等で null になり得る */
  authorId: number | null;
  /** ISO 8601 created_at */
  createdAt: string;
  /** カード末尾に追加表示したい補助情報 (例: 所属相談 id へのリンク) */
  meta?: React.ReactNode;
};

const formatAuthor = (authorId: number | null): string => {
  if (authorId === null) return "退会済み or 削除済みユーザー";
  // 暫定: author 名取得は API 拡張待ち (docs/projects/08 §4.1)
  return `ユーザー#${authorId}`;
};

const formatCreatedAt = (createdAt: string): string => {
  // タイムゾーンは SSR で UTC になる既知の課題があるが、本 PR では深追いしない
  return new Date(createdAt).toLocaleString("ja-JP");
};

export const PendingItemCard = ({
  id,
  title,
  body,
  authorId,
  createdAt,
  meta,
}: Props) => {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
        <span>#{id}</span>
        <span>{formatCreatedAt(createdAt)}</span>
      </div>

      {title !== undefined && (
        <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
      )}

      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{body}</p>

      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-gray-500">
        <span>投稿者: {formatAuthor(authorId)}</span>
        {meta}
      </div>
    </article>
  );
};
