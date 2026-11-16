export function blockNativeContextMenu(target: Document = document): () => void {
  const block = (e: MouseEvent) => {
    const el = e.target instanceof Element ? e.target : null;
    if (el?.closest("input, textarea, [contenteditable]:not([contenteditable='false'])")) return;
    e.preventDefault();
  };
  target.addEventListener("contextmenu", block);
  return () => target.removeEventListener("contextmenu", block);
}
