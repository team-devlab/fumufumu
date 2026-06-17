"use client";

import type { ConsultationDetail } from "../types";
import { AdviceConfirm } from "./AdviceConfirm";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceConfirmContainer = ({ consultation }: Props) => {
  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          アドバイス内容確認
        </h1>
      </header>
      <AdviceConfirm consultation={consultation} />
    </div>
  );
};
