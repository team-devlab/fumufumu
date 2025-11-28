// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";
import type { ConsultationEntity } from "@/types/consultation.types";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}

	async listConsultations(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const entities = await this.repository.findAll(filters);

		const responses: ConsultationResponse[] = entities
			.map(({ ConsultationsEntity, author }) => ({
				id: ConsultationsEntity.id,
				title: ConsultationsEntity.title,
				body_preview: ConsultationsEntity.body.substring(0, 100),
				draft: ConsultationsEntity.draft,
				hidden_at: ConsultationsEntity.hiddenAt?.toISOString() ?? null,
				solved_at: ConsultationsEntity.solvedAt?.toISOString() ?? null,
				created_at: ConsultationsEntity.createdAt.toISOString(),
				updated_at: ConsultationsEntity.updatedAt.toISOString(),
				author: author === null ? null : {
					id: author.id, 
					name: author.name,
					disabled: author.disabled,
				}
			}));

		return { 
			meta: { 
				total: responses.length
			}, 
			data: responses
		};
	}
}

