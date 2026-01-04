// アプリケーションエラークラス

/**
 * ベースエラークラス
 */
export class AppError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number
	) {
		super(message);
		this.name = "AppError";
	}
}

/**
 * データベースエラー（500 Internal Server Error）
 */
export class DatabaseError extends AppError {
	constructor(message: string) {
		super(message, 500);
		this.name = "DatabaseError";
	}
}

/**
 * リソースが見つからない（404 Not Found）
 */
export class NotFoundError extends AppError {
	constructor(message: string) {
		super(message, 404);
		this.name = "NotFoundError";
	}
}

/**
 * データベース制約違反（409 Conflict）
 */
export class ConflictError extends AppError {
	constructor(message: string) {
		super(message, 409);
		this.name = "ConflictError";
	}
}

/**
 * 権限エラー（403 Forbidden）
 */
export class ForbiddenError extends AppError {
	constructor(message: string) {
		super(message, 403);
		this.name = "ForbiddenError";
	}
}

/**
 * バリデーションエラー（400 Bad Request）
 */
export class ValidationError extends AppError {
	constructor(message: string) {
		super(message, 400);
		this.name = "ValidationError";
	}
}

