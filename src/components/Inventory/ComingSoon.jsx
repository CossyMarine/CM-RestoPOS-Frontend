// src/components/Inventory/ComingSoon.jsx
export default function ComingSoon({ icon: Icon, title, description }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm py-20 px-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                <Icon size={26} />
            </div>
            <h3 className="text-lg font-black text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</p>
            <span className="mt-5 text-[11px] font-bold uppercase tracking-wider text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                Coming soon
            </span>
        </div>
    );
}