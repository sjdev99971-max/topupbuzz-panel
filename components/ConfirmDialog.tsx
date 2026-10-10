"use client";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }: any) {
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg mb-2">{title}</h3>
        <p className="text-sm text-[var(--dim)] mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn">cancel</button>
          <button onClick={onConfirm} className={`btn ${danger ? "btn-danger" : "btn-primary"}`}>confirm</button>
        </div>
      </div>
    </div>
  );
}
