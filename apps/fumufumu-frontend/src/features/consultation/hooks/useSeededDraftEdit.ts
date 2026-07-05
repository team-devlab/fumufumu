"use client";

/**
 * 下書き編集ストアを「サーバ取得値」で一度だけ seed するための共有ロジック（ADR 012）。
 *
 * persist(sessionStorage) の rehydration は Next.js では mount 後に非同期反映される。
 * rehydration 完了前(hasHydrated=false)に seed すると、復元されるはずの未保存編集を
 * 初期値で上書きしてしまう。そこで rehydration 完了を待ち、かつストアが既にこの対象を
 * 保持している(editingId === targetId)場合は再 seed しない（戻る/リロードで編集が消えない）。
 *
 * ADR 003 の方針に従い useEffect は使わず、hasHydrated が true になった render で一度だけ
 * seed する。seed（サーバ値の投入）は冪等なので、Strict Mode の二重 render でも同じ結果に
 * なり安全。seed 後は editingId === targetId となりガードで再実行されない。
 *
 * enabled=false の間は seed しない。保存/公開の成功時に reset() すると editingId が一旦 null に
 * なるが、遷移完了までコンポーネントはマウントされたままのため、その隙に古い prop で再 seed
 * してしまう。送信中は enabled=false にして再 seed を止め、reset() を素直に効かせる
 * (再オープン時に最新のサーバ値で seed される)。
 *
 * 相談編集・アドバイス編集の双方から利用する想定。
 */
export const useSeededDraftEdit = (params: {
  enabled?: boolean;
  hasHydrated: boolean;
  editingId: number | null;
  targetId: number;
  seed: () => void;
}): void => {
  const { enabled = true, hasHydrated, editingId, targetId, seed } = params;

  if (enabled && hasHydrated && editingId !== targetId) {
    seed();
  }
};
