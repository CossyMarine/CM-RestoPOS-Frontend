import { useState, useEffect, useMemo, useRef } from "react";
import MenuCard from "./MenuCard";

export default function MenuGrid({
  menu,
  loading,
  search,
  category,
  categories,
  onCategoryChange,
  cart,
  onAdd,
  onTogglePin,
  onReorderPinned,
}) {
  const pinnedSource = useMemo(
    () => menu.filter((m) => m.pinned).sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0)),
    [menu]
  );
  const [pinnedOrder, setPinnedOrder] = useState(pinnedSource);
  const draggingRef = useRef(false);
  const [draggingId, setDraggingId] = useState(null);
  const longPressTimer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!draggingId) setPinnedOrder(pinnedSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedSource]);

  const filteredMenu = useMemo(() => {
    let list = menu;
    if (category !== "all") list = list.filter((m) => m.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || String(m.price).includes(q));
    }
    return list.filter((m) => !m.pinned);
  }, [menu, category, search]);

  const qtyFor = (id) => cart.find((i) => i._id === id)?.qty || 0;

  const handlePointerDown = (e, item) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      draggingRef.current = true;
      setDraggingId(item._id);
    }, 450);
  };

  const handlePointerMove = (e) => {
    if (longPressTimer.current && !draggingRef.current) {
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      return;
    }
    if (!draggingRef.current || !draggingId) return;
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest("[data-pin-id]");
    if (!target) return;
    const overId = target.getAttribute("data-pin-id");
    if (overId === draggingId) return;
    setPinnedOrder((prev) => {
      const from = prev.findIndex((i) => i._id === draggingId);
      const to = prev.findIndex((i) => i._id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (draggingRef.current && draggingId) {
      onReorderPinned(pinnedOrder.map((i) => i._id));
    }
    draggingRef.current = false;
    setDraggingId(null);
  };

  return (
    <div onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(c)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              category === c
                ? "bg-orange-500 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
            }`}
          >
            {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {pinnedOrder.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            Pinned — hold and drag to reorder
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pinnedOrder.map((item) => (
              <MenuCard
                key={item._id}
                item={item}
                qtyInCart={qtyFor(item._id)}
                onAdd={onAdd}
                onTogglePin={onTogglePin}
                draggable
                isDragging={draggingId === item._id}
                onPointerDownDrag={handlePointerDown}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        {loading && <p className="text-stone-400 text-sm col-span-full">Loading menu…</p>}
        {!loading && filteredMenu.length === 0 && pinnedOrder.length === 0 && (
          <p className="text-stone-400 text-sm col-span-full">No menu items match your search.</p>
        )}
        {!loading &&
          filteredMenu.map((item) => (
            <MenuCard key={item._id} item={item} qtyInCart={qtyFor(item._id)} onAdd={onAdd} onTogglePin={onTogglePin} />
          ))}
      </div>
    </div>
  );
                                         }
