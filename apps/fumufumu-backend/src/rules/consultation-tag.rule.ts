import { TAG_CONFIG } from "@/constants/tag";

export type ConsultationTagRuleErrorCode =
	| "TAGS_EXCEEDS_MAX"
	| "TAGS_REQUIRED_FOR_PUBLIC";

export const CONSULTATION_TAG_RULE_MESSAGES: Record<ConsultationTagRuleErrorCode, string> = {
	TAGS_EXCEEDS_MAX: `タグは${TAG_CONFIG.MAX_TAGS}個以下で選択してください`,
	TAGS_REQUIRED_FOR_PUBLIC: `タグは${TAG_CONFIG.MIN_TAGS}個以上選択してください`,
};

export function getConsultationTagRuleError(
	draft: boolean,
	tagIds?: number[],
): ConsultationTagRuleErrorCode | null {
	if (tagIds && tagIds.length > TAG_CONFIG.MAX_TAGS) {
		return "TAGS_EXCEEDS_MAX";
	}

	if (!draft && (!tagIds || tagIds.length < TAG_CONFIG.MIN_TAGS)) {
		return "TAGS_REQUIRED_FOR_PUBLIC";
	}

	return null;
}
