import type { ExperimentContent } from "../types";

/**
 * 外部APIとの通信をシミュレートする関数
 * (実際には lib/api/client 経由で Hono を叩くようにしたい)
 */
export const createContent = (
  title: string,
): Promise<ExperimentContent> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newContent: ExperimentContent = {
        id: crypto.randomUUID(),
        title: title,
        createdAt: new Date().toISOString(),
      };
      resolve(newContent);
    }, 1500); // 1.5秒待機
  });
};