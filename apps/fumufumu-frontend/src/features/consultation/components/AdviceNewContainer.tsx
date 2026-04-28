"use client";

import type { ConsultationDetail } from "../types";
import { AdviceForm } from "./AdviceForm";

type Props = {
  consultation: ConsultationDetail;
};

export const AdviceNewContainer = ({ consultation }: Props) => {
  // Containerが「機能」の最小単位として、必要なUI（AdviceForm）を配置する
  // 内部で useAdviceEntry() を呼んでいる AdviceForm をそのまま利用
  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <header className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          相談にアドバイスする
        </h1>
      </header>
      <AdviceForm consultation={consultation} />
    </div>
  );
};
