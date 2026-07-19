import { Search } from "lucide-react";

export default function MenuSearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or price..."
        className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
