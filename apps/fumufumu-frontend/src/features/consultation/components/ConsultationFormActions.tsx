type Props = {
  onBack: () => void;
  isProcessing: boolean;
};

export const ConsultationFormActions = ({ onBack, isProcessing }: Props) => {
  return (
    <div className="mt-6 px-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        disabled={isProcessing}
      >
        <span className="mr-2">←</span>
        相談一覧に戻る
      </button>
    </div>
  );
};
