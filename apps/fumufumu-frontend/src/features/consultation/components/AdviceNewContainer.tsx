"use client";

import { AdviceForm } from "./AdviceForm";
import type { ConsultationDetail } from "../types";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceNewContainer = ({ consultation }: Props) => {
  // Containerが「機能」の最小単位として、必要なUI（AdviceForm）を配置する
  // 内部で useAdviceEntry() を呼んでいる AdviceForm をそのまま利用
  return <AdviceForm consultation={consultation} />;
};
