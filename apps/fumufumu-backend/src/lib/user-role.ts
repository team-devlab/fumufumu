import { eq } from "drizzle-orm";
import { users } from "@/db/schema/user";
import type { UserRole } from "@/db/schema/user";
import type { DbInstance } from "@/index";

/**
 * appUserIdの現在のroleを取得する。ユーザーが存在しない場合はnullを返す
 */
export async function getUserRole(db: DbInstance, appUserId: number): Promise<UserRole | null> {
	const user = await db.query.users.findFirst({
		where: eq(users.id, appUserId),
		columns: { role: true },
	});

	return user?.role ?? null;
}
