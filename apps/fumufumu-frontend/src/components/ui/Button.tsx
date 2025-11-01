import React from 'react';

// Props型は最小限に
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // classNameの受け取りは必須
}

/**
 * 外部ユーティリティ（cn）に依存しない、最小限のUIボタンコンポーネント
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    // 複数のクラスを結合するロジックは、ここで単純な文字列結合として手動で処理する
    const baseClasses =
      'inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-md transition duration-150 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed';
      
    // ユーザーからのclassNameと基本クラスを結合。Tailwindの競合は考慮しない
    const finalClassName = `${baseClasses} ${className || ''}`;

    return (
      <button
        className={finalClassName}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';