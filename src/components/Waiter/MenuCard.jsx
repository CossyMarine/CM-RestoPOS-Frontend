import { useState } from "react";
import { Pin, GripVertical, UtensilsCrossed } from "lucide-react";

const CARD_STYLES = {
  small:  { img: "h-16", pad: "p-2",    name: "text-[11px]", price: "text-[11px]", badge: "w-4 h-4 text-[9px]" },
  medium: { img: "h-24", pad: "p-2.5",  name: "text-xs",      price: "text-xs",     badge: "w-5 h-5 text-[10px]" },
  large:  { img: "h-32", pad: "p-3",    name: "text-sm",      price: "text-sm",     badge: "w-6 h-6 text-xs" },
  xlarge: { img: "h-44", pad: "p-4",    name: "text-base",    price: "text-base",   badge: "w-7 h-7 text-sm" },
};

function MenuImage({ src, alt, imgSizeClass }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`w-full ${imgSizeClass} rounded-t-xl bg-gradient-to-br from-orange-50 to-stone-100 border-b border-stone-200 flex items-center justify-center`}>
        <UtensilsCrossed size={22} className="text-orange-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className={`w-full ${imgSizeClass} rounded-t-xl object-cover border-b border-stone-200`}
    />
  );
}

export default function MenuCard({
  item,
  qtyInCart = 0,
  onAdd,
  onTogglePin,
  draggable = false,
  isDragging = false,
  onPointerDownDrag,
  gridSize = "medium",
}) {
  const styles = CARD_STYLES[gridSize] || CARD_STYLES.medium;

  return (
    <div
      data-pin-id={item.pinned ? item._id : undefined}
      onPointerDown={draggable ? (e) => onPointerDownDrag?.(e, item) : undefined}
      style={draggable ? { touchAction: "none" } : undefined}
      className={`relative bg-white border rounded-xl overflow-hidden transition-all group ${
        isDragging
          ? "border-orange-400 shadow-lg scale-95 opacity-80"
          : "border-stone-200 hover:border-orange-400 hover:shadow-sm"
      }`}
    >
      {draggable && (
        <span className="absolute top-1.5 left-1.5 z-10 text-stone-400 bg-white/80 rounded p-0.5">
          <GripVertical size={12} />
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(item);
        }}
        title={item.pinned ? "Unpin item" : "Pin to top"}
        className={`absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          item.pinned
            ? "bg-orange-500 text-white"
            : "bg-white/90 text-stone-400 hover:text-orange-500 border border-stone-200"
        }`}
      >
        <Pin size={12} className={item.pinned ? "fill-current" : ""} />
      </button>

      <button onClick={() => onAdd(item)} className="w-full text-left active:scale-95 transition-transform">
        <MenuImage src={item.imageUrl} alt={item.name} imgSizeClass={styles.img} />
        <div className={styles.pad}>
          <h3 className={`font-bold text-stone-900 ${styles.name} truncate group-hover:text-orange-600 transition-colors`}>
            {item.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-orange-500 font-black ${styles.price}`}>KSh {Number(item.price).toLocaleString()}</p>
            {qtyInCart > 0 && (
              <span className={`${styles.badge} rounded-full bg-stone-900 text-white font-bold flex items-center justify-center`}>
                {qtyInCart}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
