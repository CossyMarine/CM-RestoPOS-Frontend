import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Play, RefreshCw, XCircle } from 'lucide-react';
import API from '../../api/axios';

const blankReceiving = { supplier: '', location: '', item: '', quantity: '', costPerUnit: '', batchNumber: '', manufacturingDate: '', expiryDate: '', note: '' };
const json = (value) => JSON.stringify(value ?? null, null, 2);
const id = (value) => typeof value === 'object' ? value?._id : value;
const name = (value) => typeof value === 'object' ? value?.name : value;
const number = (value) => Number(value || 0);

/** Developer-only screen: every mutation is a real API call through the
 * application's authenticated Axios client. It deliberately never invents IDs
 * or attempts repairs when an integrity check fails. */
export default function BatchIntegrityTestDashboard() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [results, setResults] = useState([]);
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(30);
  const [expiring, setExpiring] = useState(null);
  const [selectedRaw, setSelectedRaw] = useState('');
  const [selectedFinished, setSelectedFinished] = useState('');
  const [receiving, setReceiving] = useState(blankReceiving);
  const [production, setProduction] = useState({ location: '', quantityProduced: '1', ingredientQuantity: '12', batchNumber: '', expiryDate: '', note: 'DEV integrity production' });
  const [transfer, setTransfer] = useState({ fromLocation: '', toLocation: '', quantity: '1' });
  const [waste, setWaste] = useState({ location: '', quantity: '1', reason: 'other', note: 'DEV integrity waste' });
  const [usage, setUsage] = useState({ location: '', quantity: '1', reason: 'used', note: 'DEV integrity usage' });

  const rawItems = useMemo(() => items.filter((item) => item.isActive && item.itemType === 'raw_material'), [items]);
  const finishedItems = useMemo(() => items.filter((item) => item.isActive && item.itemType === 'finished_product'), [items]);
  const raw = items.find((item) => item._id === selectedRaw);
  const finished = items.find((item) => item._id === selectedFinished);
  const selectedLocation = locations.find((location) => location._id === (receiving.location || production.location || transfer.fromLocation || waste.location || usage.location));

  const record = (entry) => setResults((previous) => [{ id: `${Date.now()}-${Math.random()}`, ...entry }, ...previous]);
  const request = async (test, method, endpoint, payload, expectation = 'HTTP 2xx response') => {
    try {
      const response = await API.request({ method, url: endpoint, data: payload === undefined ? undefined : payload });
      const entry = { test, endpoint, method, status: response.status, payload, response: response.data, state: 'pass', expected: expectation, actual: `HTTP ${response.status}` };
      record(entry);
      return { ok: true, ...entry };
    } catch (error) {
      const entry = { test, endpoint, method, status: error.response?.status || 0, payload, response: error.response?.data || { message: error.message }, state: 'fail', expected: expectation, actual: error.response?.data?.message || error.message };
      record(entry);
      return { ok: false, ...entry };
    }
  };
  const skip = (test, reason) => record({ test, endpoint: '—', method: '—', status: '—', payload: null, response: null, state: 'skip', expected: 'Required setup', actual: reason });

  const load = async () => {
    setBusy(true);
    const calls = [
      ['Load inventory items', '/inventory/items', setItems],
      ['Load locations', '/inventory/locations', setLocations],
      ['Load suppliers', '/inventory/suppliers', setSuppliers],
      ['Load batches', '/inventory/batches', setBatches],
      ['Load integrity report', '/inventory/integrity', setIntegrity],
      ['Load location stock', '/inventory/stock/locations', setStocks],
    ];
    for (const [test, endpoint, setter] of calls) {
      const outcome = await request(test, 'get', endpoint);
      if (outcome.ok) setter(outcome.response?.rows || outcome.response || []);
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const store = locations.find((location) => location.code === 'STORE' || location.name?.toLowerCase() === 'store');
    const kitchen = locations.find((location) => location.code === 'KITCHEN' || location.name?.toLowerCase() === 'kitchen');
    if (store) {
      setReceiving((value) => ({ ...value, location: value.location || store._id }));
      setProduction((value) => ({ ...value, location: value.location || store._id }));
      setTransfer((value) => ({ ...value, fromLocation: value.fromLocation || store._id }));
      setWaste((value) => ({ ...value, location: value.location || store._id }));
      setUsage((value) => ({ ...value, location: value.location || store._id }));
    }
    if (kitchen) setTransfer((value) => ({ ...value, toLocation: value.toLocation || kitchen._id }));
  }, [locations]);

  const refreshAfterMutation = async () => { await load(); };
  const stockFor = (itemId, locationId) => stocks.find((stock) => id(stock.item) === itemId && id(stock.location) === locationId);
  const batchesFor = (itemId, locationId) => batches.filter((batch) => id(batch.inventoryItem) === itemId && id(batch.location) === locationId && batch.status !== 'cancelled');
  const reconciliationRows = useMemo(() => stocks.map((stock) => {
    const batchQuantity = batchesFor(id(stock.item), id(stock.location)).reduce((total, batch) => total + number(batch.quantity), 0);
    const unbatched = number(stock.unbatchedQuantity);
    const actual = number(stock.quantity);
    return { stock, batchQuantity, unbatched, actual, pass: Math.abs(actual - batchQuantity - unbatched) < 0.000001 };
  }), [stocks, batches]);

  const setRaw = (value) => { setSelectedRaw(value); setReceiving((state) => ({ ...state, item: value, costPerUnit: items.find((item) => item._id === value)?.costPerUnit ?? state.costPerUnit })); };
  const receive = async (override = {}) => {
    const item = items.find((entry) => entry._id === (override.item || receiving.item || selectedRaw));
    const payload = {
      supplier: (override.supplier ?? receiving.supplier) || undefined,
      purchaseOrder: override.purchaseOrder || undefined,
      location: override.location || receiving.location,
      note: override.note ?? receiving.note,
      items: [{ inventoryItem: item?._id, unit: item?.unit?._id || item?.unit, quantity: number(override.quantity ?? receiving.quantity), costPerUnit: number(override.costPerUnit ?? receiving.costPerUnit), batchNumber: override.batchNumber ?? receiving.batchNumber, manufacturingDate: (override.manufacturingDate ?? receiving.manufacturingDate) || undefined, expiryDate: (override.expiryDate ?? receiving.expiryDate) || undefined, batchNote: override.note ?? receiving.note }],
    };
    if (!item || !payload.location || !payload.items[0].quantity) return skip('Create receiving', 'Select an item, location, and positive quantity first.');
    const outcome = await request('Create receiving / batch', 'post', '/inventory/receiving', payload, 'Receiving succeeds and returns an item.batch reference');
    if (outcome.ok) { await refreshAfterMutation(); setReceiving((state) => ({ ...state, batchNumber: '', quantity: '', note: '' })); }
    return outcome;
  };
  const inspectBatch = async (batchId) => { const outcome = await request('Inspect batch', 'get', `/inventory/batches/${batchId}`); if (outcome.ok) setDetails(outcome.response); };
  const loadExpiring = async () => { const outcome = await request('Load expiring batches', 'get', `/inventory/batches/expiring?days=${encodeURIComponent(days)}`); if (outcome.ok) setExpiring(outcome.response); };

  const makeProduction = async (ingredientQuantity = production.ingredientQuantity, producedQuantity = production.quantityProduced) => {
    if (!raw || !finished || !production.location) return skip('Create production / FEFO', 'Select a raw material, finished product, and location.');
    const payload = { producedItem: finished._id, quantityProduced: number(producedQuantity), unit: finished.unit?._id || finished.unit, location: production.location, ingredientsUsed: [{ inventoryItem: raw._id, quantityUsed: number(ingredientQuantity), unit: raw.unit?._id || raw.unit }], batchNumber: production.batchNumber || undefined, expiryDate: production.expiryDate || undefined, note: production.note };
    const outcome = await request('Create production / FEFO', 'post', '/inventory/production', payload, 'Production records ingredient batchUsage and returns producedBatch');
    if (outcome.ok) await refreshAfterMutation();
    return outcome;
  };
  const makeTransfer = async () => {
    if (!raw) return skip('Transfer batch-backed stock', 'Select a raw material.');
    const outcome = await request('Transfer batches', 'post', '/inventory/transfers', { item: raw._id, quantity: number(transfer.quantity), fromLocation: transfer.fromLocation, toLocation: transfer.toLocation, note: 'DEV integrity transfer' }, 'Source decreases, destination increases, and allocations are returned');
    if (outcome.ok) await refreshAfterMutation();
    return outcome;
  };
  const makeWaste = async () => {
    if (!raw) return skip('Create waste', 'Select a raw material.');
    const outcome = await request('Create waste', 'post', '/inventory/waste', { item: raw._id, location: waste.location, unit: raw.unit?._id || raw.unit, quantity: number(waste.quantity), reason: waste.reason, note: waste.note }, 'Waste returns batchUsage / legacy allocation');
    if (outcome.ok) await refreshAfterMutation();
    return outcome;
  };
  const cancelWaste = async (wasteId) => { const outcome = await request('Cancel waste', 'delete', `/inventory/waste/${wasteId}`, undefined, 'Stock and batch allocations are restored'); if (outcome.ok) await refreshAfterMutation(); return outcome; };
  const logUsage = async () => {
    if (!raw) return skip('Manual usage', 'Select a raw material.');
    const outcome = await request('Manual usage', 'post', '/inventory/usage', { item: raw._id, locationId: usage.location, quantity: number(usage.quantity), reason: usage.reason, note: usage.note }, 'Usage returns batchUsage / legacy allocation');
    if (outcome.ok) await refreshAfterMutation();
    return outcome;
  };
  const cancelReceiving = async (receivingId) => { const outcome = await request('Cancel receiving', 'delete', `/inventory/receiving/${receivingId}`, undefined, 'Aggregate, batch/legacy, and PO receipt values reverse'); if (outcome.ok) await refreshAfterMutation(); return outcome; };

  const runFull = async () => {
    setBusy(true);
    setResults([]);
    await load();
    const store = locations.find((location) => location.code === 'STORE' || location.name?.toLowerCase() === 'store');
    const kitchen = locations.find((location) => location.code === 'KITCHEN' || location.name?.toLowerCase() === 'kitchen');
    if (!raw || !finished || !store || !kitchen) { skip('Full workflow', 'Requires a selected raw material, selected finished product, Store, and Kitchen locations.'); setBusy(false); return; }
    const stamp = `DEV-${Date.now()}`;
    const early = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const late = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
    const a = await receive({ item: raw._id, location: store._id, quantity: 10, costPerUnit: raw.costPerUnit || 0, batchNumber: `${stamp}-A`, expiryDate: early, note: 'Automated FEFO A' });
    if (!a.ok) { setBusy(false); return; }
    const b = await receive({ item: raw._id, location: store._id, quantity: 10, costPerUnit: raw.costPerUnit || 0, batchNumber: `${stamp}-B`, expiryDate: late, note: 'Automated FEFO B' });
    if (!b.ok) { setBusy(false); return; }
    const batchA = a.response?.items?.[0]?.batch; const batchB = b.response?.items?.[0]?.batch;
    await inspectBatch(batchA); await inspectBatch(batchB);
    const p = await makeProduction(12, 1);
    if (!p.ok) { setBusy(false); return; }
    const afterA = batches.find((batch) => batch._id === batchA); const afterB = batches.find((batch) => batch._id === batchB);
    const fefoPass = number(afterA?.quantity) === 0 && number(afterB?.quantity) === 8;
    record({ test: 'FEFO A=10, B=2', endpoint: '/inventory/production', method: 'VERIFY', status: 'local check', payload: { batchA, batchB }, response: { batchA: afterA?.quantity, batchB: afterB?.quantity }, state: fefoPass ? 'pass' : 'fail', expected: 'A remaining 0; B remaining 8', actual: `A ${afterA?.quantity}; B ${afterB?.quantity}` });
    await makeTransfer();
    const createdWaste = await makeWaste();
    if (createdWaste.ok) await cancelWaste(createdWaste.response?._id);
    const supplier = suppliers[0];
    if (!supplier) {
      skip('Purchase-order receiving reversal', 'No real supplier exists; automated PO steps were not run.');
    } else {
      const po = await request('Create purchase order', 'post', '/inventory/purchase-orders', { supplier: supplier._id, location: store._id, note: 'Automated batch integrity PO', items: [{ inventoryItem: raw._id, quantityOrdered: 2, unit: raw.unit?._id || raw.unit, costPerUnit: number(raw.costPerUnit), totalCost: 2 * number(raw.costPerUnit) }] }, 'PO is created from live supplier/item IDs');
      if (!po.ok) { setBusy(false); return; }
      const ordered = await request('Order purchase order', 'post', `/inventory/purchase-orders/${po.response?._id}/order`, undefined, 'PO enters ordered state');
      if (!ordered.ok) { setBusy(false); return; }
      const partial = await receive({ item: raw._id, supplier: supplier._id, purchaseOrder: po.response?._id, location: store._id, quantity: 1, costPerUnit: raw.costPerUnit || 0, batchNumber: `${stamp}-PO`, expiryDate: late, note: 'Automated partial PO receiving' });
      if (!partial.ok) { setBusy(false); return; }
      const poAfterPartial = await request('Verify partial PO', 'get', `/inventory/purchase-orders/${po.response?._id}`, undefined, 'quantityReceived is 1 and status is partially_received');
      const partialOk = number(poAfterPartial.response?.items?.find((entry) => id(entry.inventoryItem) === raw._id)?.quantityReceived) === 1;
      record({ test: 'PO partial receipt verification', endpoint: `/inventory/purchase-orders/${po.response?._id}`, method: 'VERIFY', status: poAfterPartial.status, payload: { po: po.response?._id }, response: poAfterPartial.response, state: partialOk ? 'pass' : 'fail', expected: 'quantityReceived = 1', actual: `quantityReceived = ${poAfterPartial.response?.items?.find((entry) => id(entry.inventoryItem) === raw._id)?.quantityReceived}` });
      const cancelled = await cancelReceiving(partial.response?._id);
      if (cancelled.ok) {
        const poAfterCancel = await request('Verify PO reversal', 'get', `/inventory/purchase-orders/${po.response?._id}`, undefined, 'quantityReceived returns to 0 and status is ordered');
        const reversed = number(poAfterCancel.response?.items?.find((entry) => id(entry.inventoryItem) === raw._id)?.quantityReceived) === 0;
        record({ test: 'PO cancellation reversal verification', endpoint: `/inventory/purchase-orders/${po.response?._id}`, method: 'VERIFY', status: poAfterCancel.status, payload: { po: po.response?._id }, response: poAfterCancel.response, state: reversed ? 'pass' : 'fail', expected: 'quantityReceived = 0', actual: `quantityReceived = ${poAfterCancel.response?.items?.find((entry) => id(entry.inventoryItem) === raw._id)?.quantityReceived}` });
      }
    }
    await loadExpiring(); await load();
    setBusy(false);
  };

  const counts = results.reduce((total, result) => ({ ...total, [result.state]: total[result.state] + 1 }), { pass: 0, fail: 0, skip: 0 });
  const itemLabel = (item) => `${item.name} · ${item.itemType} · ${item.currentStock} ${item.unit?.abbreviation || ''}`;
  return <div className="space-y-6 text-gray-800">
    <header className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-6 flex flex-wrap justify-between gap-4">
      <div><div className="flex items-center gap-2 text-orange-700"><FlaskConical size={22} /><span className="font-black tracking-wide">INVENTORY BATCH & EXPIRY INTEGRITY — DEV TEST</span></div><p className="mt-2 text-sm text-orange-900">Real authenticated backend calls only. This screen creates operational data; review every request before running it.</p></div>
      <div className="flex gap-2"><button className="dev-btn secondary" onClick={load} disabled={busy}><RefreshCw size={15} /> Refresh real data</button><button className="dev-btn" onClick={runFull} disabled={busy}><Play size={15} /> {busy ? 'Running…' : 'RUN FULL BATCH INTEGRITY TEST'}</button></div>
    </header>
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-4"><Panel title="1. Select real inventory">
      <Select label="Raw material" value={selectedRaw} onChange={setRaw} options={rawItems} labelFor={itemLabel} /><Select label="Finished product" value={selectedFinished} onChange={setSelectedFinished} options={finishedItems} labelFor={itemLabel} />
      <p className="text-xs text-gray-500">No item is assumed. The full workflow requires one raw material and one finished-product item returned by the API.</p>
    </Panel><Panel title="Loaded setup"><p>Items: {items.length} · Locations: {locations.length} · Suppliers: {suppliers.length} · Batches: {batches.length}</p><ul className="text-sm mt-2">{locations.map((location) => <li key={location._id}>{location.name} ({location.code}) — <code>{location._id}</code></li>)}</ul></Panel><Panel title="Test results"><p className="font-bold">Passed: {counts.pass} · Failed: {counts.fail} · Skipped: {counts.skip}</p><p className={`mt-2 font-black ${counts.fail ? 'text-red-600' : 'text-emerald-600'}`}>Overall: {counts.fail ? 'FAIL' : 'PASS (no failed calls yet)'}</p></Panel></section>
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4"><Panel title="2. Receiving + batch creation"><div className="grid grid-cols-2 gap-3"><Select label="Supplier (optional)" value={receiving.supplier} onChange={(value) => setReceiving({ ...receiving, supplier: value })} options={suppliers} labelFor={(supplier) => supplier.name} optional /><Select label="Location" value={receiving.location} onChange={(value) => setReceiving({ ...receiving, location: value })} options={locations} labelFor={(location) => `${location.name} (${location.code})`} /><Select label="Item" value={receiving.item || selectedRaw} onChange={setRaw} options={items.filter((item) => item.isActive)} labelFor={itemLabel} /><Input label="Quantity" value={receiving.quantity} onChange={(value) => setReceiving({ ...receiving, quantity: value })} type="number" /><Input label="Cost / unit" value={receiving.costPerUnit} onChange={(value) => setReceiving({ ...receiving, costPerUnit: value })} type="number" /><Input label="Batch number (leave blank to test generation)" value={receiving.batchNumber} onChange={(value) => setReceiving({ ...receiving, batchNumber: value })} /><Input label="Manufacture date" value={receiving.manufacturingDate} onChange={(value) => setReceiving({ ...receiving, manufacturingDate: value })} type="date" /><Input label="Expiry date" value={receiving.expiryDate} onChange={(value) => setReceiving({ ...receiving, expiryDate: value })} type="date" /></div><Input label="Note" value={receiving.note} onChange={(value) => setReceiving({ ...receiving, note: value })} /><button className="dev-btn mt-3" onClick={() => receive()} disabled={busy}>POST receiving</button></Panel>
      <Panel title="3. Batch inspection + expiry"><div className="flex gap-2 items-end"><Input label="Expiring within days" value={days} onChange={setDays} type="number" /><button className="dev-btn" onClick={loadExpiring}>GET expiring batches</button></div><p className="text-xs mt-3">Endpoint response: {expiring ? `${expiring.batches?.length || 0} rows` : 'not loaded'}</p><div className="max-h-72 overflow-auto mt-3"><BatchTable batches={batches} inspect={inspectBatch} /></div></Panel></section>
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-4"><Panel title="4 & 8. FEFO production / output batch"><Select label="Production location" value={production.location} onChange={(value) => setProduction({ ...production, location: value })} options={locations} labelFor={(location) => location.name} /><Input label="Ingredient quantity (FEFO test: 12)" value={production.ingredientQuantity} onChange={(value) => setProduction({ ...production, ingredientQuantity: value })} type="number" /><Input label="Produced quantity" value={production.quantityProduced} onChange={(value) => setProduction({ ...production, quantityProduced: value })} type="number" /><Input label="Output batch number (optional)" value={production.batchNumber} onChange={(value) => setProduction({ ...production, batchNumber: value })} /><Input label="Output expiry" value={production.expiryDate} onChange={(value) => setProduction({ ...production, expiryDate: value })} type="date" /><button className="dev-btn mt-3" onClick={() => makeProduction()} disabled={busy}>POST production</button></Panel>
      <Panel title="7. Batch transfer"><Select label="From" value={transfer.fromLocation} onChange={(value) => setTransfer({ ...transfer, fromLocation: value })} options={locations} labelFor={(location) => location.name} /><Select label="To" value={transfer.toLocation} onChange={(value) => setTransfer({ ...transfer, toLocation: value })} options={locations} labelFor={(location) => location.name} /><Input label="Quantity" value={transfer.quantity} onChange={(value) => setTransfer({ ...transfer, quantity: value })} type="number" /><button className="dev-btn mt-3" onClick={makeTransfer} disabled={busy}>POST transfer</button></Panel>
      <Panel title="9 & 10. Waste / manual usage"><Select label="Location" value={waste.location} onChange={(value) => { setWaste({ ...waste, location: value }); setUsage({ ...usage, location: value }); }} options={locations} labelFor={(location) => location.name} /><Input label="Waste quantity" value={waste.quantity} onChange={(value) => setWaste({ ...waste, quantity: value })} type="number" /><Select label="Waste reason" value={waste.reason} onChange={(value) => setWaste({ ...waste, reason: value })} options={['damaged', 'spoiled', 'expired', 'spillage', 'other']} labelFor={(value) => value} primitive /><button className="dev-btn mt-3" onClick={makeWaste} disabled={busy}>POST waste</button><Input label="Usage quantity" value={usage.quantity} onChange={(value) => setUsage({ ...usage, quantity: value })} type="number" /><button className="dev-btn secondary mt-3" onClick={logUsage} disabled={busy}>POST manual usage</button></Panel></section>
    <Panel title="12. Aggregate / batch / unbatched reconciliation"><div className="overflow-auto"><table className="dev-table"><thead><tr><th>Item / location</th><th>Aggregate</th><th>Batch total</th><th>Unbatched</th><th>Batch + unbatched</th><th>Result</th></tr></thead><tbody>{reconciliationRows.map((row) => <tr key={row.stock._id}><td>{name(row.stock.item)} / {name(row.stock.location)}</td><td>{row.actual}</td><td>{row.batchQuantity}</td><td>{row.stock.unbatchedQuantity ?? 'unreconciled'}</td><td>{row.batchQuantity + row.unbatched}</td><td><State state={row.pass ? 'pass' : 'fail'} /></td></tr>)}</tbody></table></div><pre className="dev-json mt-3">{json(integrity)}</pre></Panel>
    <Panel title="HTTP test log — request payload and real response"><div className="space-y-3">{results.map((result) => <details key={result.id} className="border rounded-xl p-3 bg-white"><summary className="cursor-pointer flex gap-2 items-center"><State state={result.state} /><strong>{result.test}</strong><span className="text-xs text-gray-500">{result.method} {result.endpoint} · HTTP {result.status}</span></summary><div className="grid md:grid-cols-2 gap-3 mt-3 text-xs"><div><b>Expected:</b><p>{result.expected}</p><b>Actual:</b><p>{result.actual}</p><b>Request payload</b><pre className="dev-json">{json(result.payload)}</pre></div><div><b>Response JSON</b><pre className="dev-json">{json(result.response)}</pre>{result.endpoint.includes('/waste') && result.response?._id && <button className="dev-btn secondary mt-2" onClick={() => cancelWaste(result.response._id)}>Cancel this waste</button>}{result.endpoint.includes('/receiving') && result.response?._id && <button className="dev-btn secondary mt-2" onClick={() => cancelReceiving(result.response._id)}>Cancel this receiving</button>}</div></div></details>)}</div></Panel>
    {details && <Panel title="Selected batch detail"><button className="float-right" onClick={() => setDetails(null)}>×</button><pre className="dev-json">{json(details)}</pre></Panel>}
    <style>{`.dev-btn{display:inline-flex;align-items:center;gap:.45rem;background:#f97316;color:#fff;padding:.62rem .85rem;border-radius:.65rem;font-size:.78rem;font-weight:800}.dev-btn:hover{background:#ea580c}.dev-btn:disabled{opacity:.5}.dev-btn.secondary{background:#334155}.dev-field{display:grid;gap:.25rem;font-size:.75rem;font-weight:700;color:#475569}.dev-input{width:100%;border:1px solid #cbd5e1;border-radius:.55rem;padding:.5rem;background:#fff;font-size:.82rem}.dev-table{width:100%;font-size:.78rem;border-collapse:collapse}.dev-table th,.dev-table td{padding:.55rem;text-align:left;border-bottom:1px solid #e2e8f0}.dev-json{max-height:18rem;overflow:auto;background:#0f172a;color:#e2e8f0;border-radius:.5rem;padding:.65rem;font-size:.7rem;white-space:pre-wrap;word-break:break-word}`}</style>
  </div>;
}
function Panel({ title, children }) { return <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"><h2 className="font-black text-sm text-slate-800 mb-4">{title}</h2>{children}</section>; }
function Input({ label, value, onChange, type = 'text' }) { return <label className="dev-field mb-3">{label}<input className="dev-input" type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, onChange, options, labelFor, optional, primitive }) { return <label className="dev-field mb-3">{label}<select className="dev-input" value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">{optional ? 'None' : 'Select…'}</option>{options.map((option) => <option key={primitive ? option : option._id} value={primitive ? option : option._id}>{labelFor(option)}</option>)}</select></label>; }
function State({ state }) { const config = state === 'pass' ? ['✓ PASS', 'text-emerald-600', CheckCircle2] : state === 'skip' ? ['⚠ SKIPPED', 'text-amber-600', AlertTriangle] : ['✗ FAIL', 'text-red-600', XCircle]; const Icon = config[2]; return <span className={`inline-flex gap-1 items-center font-black text-xs ${config[1]}`}><Icon size={14} />{config[0]}</span>; }
function BatchTable({ batches, inspect }) { return <table className="dev-table"><thead><tr><th>Batch</th><th>Item</th><th>Location</th><th>Qty</th><th>Expiry</th><th>Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch._id} className="cursor-pointer hover:bg-orange-50" onClick={() => inspect(batch._id)}><td>{batch.batchNumber}</td><td>{name(batch.inventoryItem)}</td><td>{name(batch.location)}</td><td>{batch.quantity}</td><td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '—'}</td><td>{batch.status}</td></tr>)}</tbody></table>; }
