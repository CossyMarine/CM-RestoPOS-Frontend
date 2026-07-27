import React from 'react';

export const PaymentFilters = ({
  activePreset,
  setActivePreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onPresetChange,
}) => {
  const presets = [
    { label: 'Today (EAT)', value: 'today' },
    { label: 'This Week', value: 'this_week' },
    { label: 'Last Seven days', value: 'last_7_days' },
    { label: 'This month', value: 'this_month' },
    { label: 'Last 30 days', value: 'last_30_days' },
  ];

  const handlePresetSelect = (value) => {
    setActivePreset(value);
    onPresetChange(value);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetSelect(preset.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === preset.value
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Calendar Date Picker */}
      <div className="flex items-center gap-2 w-full lg:w-auto">
        <span className="text-sm text-gray-500 font-medium">Calendar Range:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setActivePreset('custom');
            setStartDate(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setActivePreset('custom');
            setEndDate(e.target.value);
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
      </div>
    </div>
  );
};
