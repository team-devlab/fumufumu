// Business層: 相談ビジネスロジック
import type { ConsultationRepository, ConsultationFilters } from "@/repositories/consultation.repository";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}

	async listConsultaitons(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const entities = await this.repository.findAll(filters);

		const responses: ConsultationResponse[] = entities
			.filter(({ author }) => author !== null)
			.map(({ consultations, author }) => ({
				id: consultations.id,
				title: consultations.title,
				body_preview: consultations.body.substring(0, 100),
				draft: consultations.draft,
				hidden_at: consultations.hiddenAt?.toISOString() ?? null,
				solved_at: consultations.solvedAt?.toISOString() ?? null,
				created_at: consultations.createdAt.toISOString(),
				updated_at: consultations.updatedAt.toISOString(),
				author: {
					id: author!.id,
					name: author!.name,
					disabled: author!.disabled,
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

