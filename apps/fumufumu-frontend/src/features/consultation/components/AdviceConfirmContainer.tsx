"use client";

import type { ConsultationDetail } from "../types";
import { AdviceConfirm } from "./AdviceConfirm";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceConfirmContainer = ({ consultation }: Props) => {
  return <AdviceConfirm consultation={consultation} />;
};
