"use client";

type AlertProps = {
  message: string;
  tone?: "error" | "info" | "success";
  onDismiss?: () => void;
};

const TONES = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-green-200 bg-green-50 text-green-700",
};

export default function Alert({ message, tone = "error", onDismiss }: AlertProps) {
  if (!message) return null;

  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${TONES[tone]}`}>
      <p>{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="font-medium opacity-70 hover:opacity-100">
          Dismiss
        </button>
      )}
    </div>
  );
}
