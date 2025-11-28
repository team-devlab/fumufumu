// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}

	async listConsultations(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const entities = await this.repository.findAll(filters);

		const responses: ConsultationResponse[] = entities
			.map(({ consultations, author }) => ({
				id: consultations.id,
				title: consultations.title,
				body_preview: consultations.body.substring(0, 100),
				draft: consultations.draft,
				hidden_at: consultations.hiddenAt?.toISOString() ?? null,
				solved_at: consultations.solvedAt?.toISOString() ?? null,
				created_at: consultations.createdAt.toISOString(),
				updated_at: consultations.updatedAt.toISOString(),
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

