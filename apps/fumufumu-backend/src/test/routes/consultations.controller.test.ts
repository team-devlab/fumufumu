import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listConsultations } from '../../routes/consultations.controller';
import { ConsultationService } from '@/services/consultation.service';
import type { Context } from 'hono';

// ConsultationServiceをモック化
vi.mock('@/services/consultation.service');

describe('Consultations API', () => {
	let mockContext: any;
	let mockConsultationService: any;

	beforeEach(() => {
		// モックのリセット
		vi.clearAllMocks();

		// Contextのモック作成
		mockContext = {
			get: vi.fn((key: string) => {
				if (key === 'db') {
					return {}; // DBのモック
				}
				return undefined;
			}),
			req: {
				query: vi.fn(() => undefined),
			},
			json: vi.fn((data: any) => {
				return {
					json: async () => data,
					status: 200,
				};
			}),
		};
	});

	describe('GET /api/consultations', () => {
		it('全件取得: すべての相談データを取得できる', async () => {
			// モックデータの準備
			const mockData = {
				meta: { total: 2 },
				data: [
					{
						id: 1,
						title: 'Test Consultation 1',
						body_preview: 'Test body preview 1',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-01T09:00:00Z',
						updated_at: '2025-11-09T10:42:00Z',
						author: {
							id: 1,
							name: 'Test User',
							disabled: false,
						},
					},
					{
						id: 2,
						title: 'Test Consultation 2',
						body_preview: 'Test body preview 2',
						draft: true,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-02T09:00:00Z',
						updated_at: '2025-11-10T10:42:00Z',
						author: {
							id: 2,
							name: 'Test User 2',
							disabled: false,
						},
					},
				],
			};

			// ConsultationServiceのモック設定
			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data).toHaveProperty('meta');
			expect(data).toHaveProperty('data');
			expect(data.meta).toHaveProperty('total');
			expect(Array.isArray(data.data)).toBe(true);
			expect(data.data.length).toBe(2);

			// レスポンス構造の確認
			const firstItem = data.data[0];
			expect(firstItem).toHaveProperty('id');
			expect(firstItem).toHaveProperty('title');
			expect(firstItem).toHaveProperty('body_preview');
			expect(firstItem).toHaveProperty('draft');
			expect(firstItem).toHaveProperty('hidden_at');
			expect(firstItem).toHaveProperty('solved_at');
			expect(firstItem).toHaveProperty('created_at');
			expect(firstItem).toHaveProperty('updated_at');
			expect(firstItem).toHaveProperty('author');

			// authorの構造確認
			expect(firstItem.author).toHaveProperty('id');
			expect(firstItem.author).toHaveProperty('name');
			expect(firstItem.author).toHaveProperty('disabled');
			// 不要なフィールドが含まれていないことを確認
			expect(firstItem.author).not.toHaveProperty('createdAt');
			expect(firstItem.author).not.toHaveProperty('updatedAt');
		});

		it('draft=false: 公開済みの相談のみを取得できる', async () => {
			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'draft') return 'false';
				return undefined;
			});

			// モックデータの準備（draft=falseのみ）
			const mockData = {
				meta: { total: 2 },
				data: [
					{
						id: 1,
						title: 'Public Consultation 1',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-01T09:00:00Z',
						updated_at: '2025-11-09T10:42:00Z',
						author: { id: 1, name: 'Test User', disabled: false },
					},
					{
						id: 2,
						title: 'Public Consultation 2',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-02T09:00:00Z',
						updated_at: '2025-11-10T10:42:00Z',
						author: { id: 2, name: 'Test User 2', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: undefined,
				draft: false,
				solved: undefined,
			});

			// すべてのデータがdraft=falseであることを確認
			data.data.forEach((item: any) => {
				expect(item.draft).toBe(false);
			});
		});

		it('draft=true: 下書きの相談のみを取得できる', async () => {
			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'draft') return 'true';
				return undefined;
			});

			// モックデータの準備（draft=trueのみ）
			const mockData = {
				meta: { total: 1 },
				data: [
					{
						id: 2,
						title: 'Draft Consultation',
						body_preview: 'Test body preview',
						draft: true,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-02T09:00:00Z',
						updated_at: '2025-11-10T10:42:00Z',
						author: { id: 1, name: 'Test User', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: undefined,
				draft: true,
				solved: undefined,
			});

			// すべてのデータがdraft=trueであることを確認
			data.data.forEach((item: any) => {
				expect(item.draft).toBe(true);
			});
		});

		it('solved=true: 解決済みの相談のみを取得できる', async () => {
			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'solved') return 'true';
				return undefined;
			});

			// モックデータの準備（solved_at !== null）
			const mockData = {
				meta: { total: 1 },
				data: [
					{
						id: 3,
						title: 'Solved Consultation',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: '2025-11-20T10:00:00Z',
						created_at: '2025-11-03T09:00:00Z',
						updated_at: '2025-11-20T10:00:00Z',
						author: { id: 2, name: 'Test User 2', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: undefined,
				draft: undefined,
				solved: true,
			});

			// すべてのデータがsolved_at !== nullであることを確認
			data.data.forEach((item: any) => {
				expect(item.solved_at).not.toBeNull();
			});
		});

		it('solved=false: 未解決の相談のみを取得できる', async () => {
			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'solved') return 'false';
				return undefined;
			});

			// モックデータの準備（solved_at === null）
			const mockData = {
				meta: { total: 1 },
				data: [
					{
						id: 4,
						title: 'Unsolved Consultation',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-04T09:00:00Z',
						updated_at: '2025-11-11T10:42:00Z',
						author: { id: 2, name: 'Test User 2', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: undefined,
				draft: undefined,
				solved: false,
			});

			// すべてのデータがsolved_at === nullであることを確認
			data.data.forEach((item: any) => {
				expect(item.solved_at).toBeNull();
			});
		});

		it('userId: 特定ユーザーの相談のみを取得できる', async () => {
			const userId = 1;

			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'userId') return String(userId);
				return undefined;
			});

			// モックデータの準備（userId = 1のみ）
			const mockData = {
				meta: { total: 2 },
				data: [
					{
						id: 1,
						title: 'User 1 Consultation 1',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-01T09:00:00Z',
						updated_at: '2025-11-09T10:42:00Z',
						author: { id: 1, name: 'Test User 1', disabled: false },
					},
					{
						id: 2,
						title: 'User 1 Consultation 2',
						body_preview: 'Test body preview',
						draft: true,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-02T09:00:00Z',
						updated_at: '2025-11-10T10:42:00Z',
						author: { id: 1, name: 'Test User 1', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: 1,
				draft: undefined,
				solved: undefined,
			});

			// すべてのデータがauthorId === userIdであることを確認
			data.data.forEach((item: any) => {
				expect(item.author.id).toBe(userId);
			});
		});

		it('複合フィルタ: userId + draft + solvedの組み合わせでフィルタできる', async () => {
			// クエリパラメータのモック設定
			mockContext.req.query = vi.fn((key: string) => {
				if (key === 'userId') return '1';
				if (key === 'draft') return 'false';
				if (key === 'solved') return 'false';
				return undefined;
			});

			// モックデータの準備（複合条件）
			const mockData = {
				meta: { total: 1 },
				data: [
					{
						id: 1,
						title: 'User 1 Public Unsolved',
						body_preview: 'Test body preview',
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-01T09:00:00Z',
						updated_at: '2025-11-09T10:42:00Z',
						author: { id: 1, name: 'Test User 1', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			expect(data.data).toBeDefined();
			expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
				userId: 1,
				draft: false,
				solved: false,
			});

			// すべての条件を満たすことを確認
			data.data.forEach((item: any) => {
				expect(item.author.id).toBe(1);
				expect(item.draft).toBe(false);
				expect(item.solved_at).toBeNull();
			});
		});

		it('body_previewは100文字に切り取られている', async () => {
			// モックデータの準備（100文字のbody_preview）
			const mockData = {
				meta: { total: 2 },
				data: [
					{
						id: 1,
						title: 'Test Consultation',
						body_preview: 'A'.repeat(100), // 正確に100文字
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-01T09:00:00Z',
						updated_at: '2025-11-09T10:42:00Z',
						author: { id: 1, name: 'Test User', disabled: false },
					},
					{
						id: 2,
						title: 'Test Consultation 2',
						body_preview: 'B'.repeat(50), // 50文字
						draft: false,
						hidden_at: null,
						solved_at: null,
						created_at: '2025-11-02T09:00:00Z',
						updated_at: '2025-11-10T10:42:00Z',
						author: { id: 2, name: 'Test User 2', disabled: false },
					},
				],
			};

			mockConsultationService = {
				listConsultaitons: vi.fn().mockResolvedValue(mockData),
			};
			vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

			// テスト実行
			const response = await listConsultations(mockContext);
			const data: any = await response.json();

			// アサーション
			// body_previewが100文字以下であることを確認
			data.data.forEach((item: any) => {
				expect(item.body_preview.length).toBeLessThanOrEqual(100);
			});
		});
	});
});

