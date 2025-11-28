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
			.filter((entity): entity is ConsultationEntity & { author: NonNullable<ConsultationEntity['author']> } => entity.author !== null)
			.map((entity) => ({
				id: entity.id,
				title: entity.title,
				body_preview: entity.body.substring(0, 100),
				draft: entity.draft,
				hidden_at: entity.hiddenAt?.toISOString() ?? null,
				solved_at: entity.solvedAt?.toISOString() ?? null,
				created_at: entity.createdAt.toISOString(),
				updated_at: entity.updatedAt.toISOString(),
				author: {
					id: entity.author.id,
					name: entity.author.name,
					disabled: entity.author.disabled,
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

