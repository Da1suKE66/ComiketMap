"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Modal({ children, title, onClose, wide = false }: { children: ReactNode; title: string; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null; dialog.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} aria-label={title} onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === e.currentTarget && ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeRef.current(); } }}>
    <div className="modal-title"><h2>{title}</h2><button className="icon-button" aria-label="关闭窗口" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
