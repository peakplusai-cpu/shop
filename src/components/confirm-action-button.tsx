'use client';

type ConfirmActionButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirmText: string;
  className: string;
};

export function ConfirmActionButton({
  action,
  label,
  confirmText,
  className,
}: ConfirmActionButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
