export default function KitchenSettingsTab({ settingsDraft, setSettingsDraft, sounds, onSave, saving }) {
    if (!settingsDraft) return null;

    return (
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-800 mb-3">Queue Order</h3>
                <div className="flex gap-3">
                    {['oldest', 'newest'].map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setSettingsDraft((d) => ({ ...d, sortOrder: opt }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                settingsDraft.sortOrder === opt
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                            }`}
                        >
                            {opt === 'oldest' ? 'Oldest first (default)' : 'Newest first'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-800 mb-1">Serve Confirmation</h3>
                <p className="text-xs text-gray-400 mb-3">
                    When on (default), a cook must tap "Serve Order" to clear a ticket. When off, a ticket
                    clears itself automatically once every item on it is checked ready.
                </p>
                <button
                    onClick={() => setSettingsDraft((d) => ({ ...d, requireClickToServe: !d.requireClickToServe }))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        settingsDraft.requireClickToServe
                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                    }`}
                >
                    {settingsDraft.requireClickToServe ? 'Require click to serve: ON' : 'Require click to serve: OFF'}
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-800 mb-3">Card Size</h3>
                <div className="flex gap-3">
                    {['small', 'medium', 'large'].map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setSettingsDraft((d) => ({ ...d, cardSize: opt }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize border transition-all ${
                                settingsDraft.cardSize === opt
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-800 mb-3">Sound</h3>
                <button
                    onClick={() => setSettingsDraft((d) => ({ ...d, soundEnabled: !d.soundEnabled }))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        settingsDraft.soundEnabled
                            ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-500/40'
                    }`}
                >
                    {settingsDraft.soundEnabled ? '🔊 Alarm sound: ON' : '🔇 Alarm sound: OFF'}
                </button>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="text-xs text-gray-400 font-bold block mb-2">Alarm Clip</label>
                    <select
                        value={settingsDraft.notificationSoundId || ''}
                        onChange={(e) => setSettingsDraft((d) => ({ ...d, notificationSoundId: e.target.value || null }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                    >
                        <option value="">Default beep</option>
                        {sounds.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                        Upload new clips from Admin → Kitchen Management → Settings.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-gray-800 mb-3">Urgency Thresholds (minutes)</h3>
                <div className="flex gap-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">Late (yellow)</label>
                        <input
                            type="number"
                            min={1}
                            value={settingsDraft.lateThresholdMinutes}
                            onChange={(e) => setSettingsDraft((d) => ({ ...d, lateThresholdMinutes: Number(e.target.value) }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-24"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">Critical (red)</label>
                        <input
                            type="number"
                            min={1}
                            value={settingsDraft.criticalThresholdMinutes}
                            onChange={(e) => setSettingsDraft((d) => ({ ...d, criticalThresholdMinutes: Number(e.target.value) }))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-24"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors shadow-md shadow-orange-500/10"
            >
                {saving ? 'Saving…' : 'Save Settings'}
            </button>
        </div>
    );
}
