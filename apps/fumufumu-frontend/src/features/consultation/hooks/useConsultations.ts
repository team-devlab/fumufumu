"use client";

import { useEffect, useState } from "react";
import { fetchConsultations } from "../api/mockApi";
import { Consultation } from "../types";

export const useConsultations = () => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [total, setTotal] = useState(0); // 総件数も管理できるようにしておく
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchConsultations();
        // レスポンス構造 { meta, data } に合わせて展開
        setConsultations(response.data);
        setTotal(response.meta.total);
      } catch (e) {
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return { consultations, total, isLoading, error };
};
