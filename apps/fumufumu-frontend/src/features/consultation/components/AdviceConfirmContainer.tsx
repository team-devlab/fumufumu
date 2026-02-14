"use client";

import { AdviceConfirm } from "./AdviceConfirm";
import type { ConsultationDetail } from "../types";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceConfirmContainer = ({ consultation }: Props) => {
  return <AdviceConfirm consultation={consultation} />;
};
