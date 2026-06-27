import "@testing-library/jest-dom/vitest"; // カスタムマッチャーを有効化
import { vi } from "vitest";

// next/navigation の useRouter は AppRouter context が無いと invariant で死ぬため、
// 全 unit test で安全に使えるよう no-op スタブで上書きする。
// 個別テストで挙動を観測したい場合は vi.mocked(...) で上書きする。
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
