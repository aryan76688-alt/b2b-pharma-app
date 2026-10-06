with open("src/app/salesman/orders/create/page.tsx", "r") as f:
    content = f.read()

import_alert = "import { AlertCircle"
if "AlertTriangle" not in content:
    content = content.replace("import {", "import { AlertTriangle, AlertCircle,", 1)

batch_modal_old = """      <Dialog isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Select Batch" description={activeProduct?.productName}>
        <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
          {activeProduct?.batches?.map(b => {
             const cartKey = `${activeProduct.id}_${b.id}`;
             const item = cart[cartKey];
             return (
               <div key={b.id} className="border border-slate-200 rounded-xl p-3 bg-white">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Batch: {b.batchNo || 'N/A'}</p>
                     <p className="text-xs text-slate-500">Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'} • Stock: <span className={b.stockQty > 0 ? "text-slate-800 font-bold" : "text-red-500 font-bold"}>{b.stockQty}</span></p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-shreeji-blue">PTR: {formatCurrency(b.ptr)}</p>
                     <p className="text-xs text-slate-400 line-through">MRP: {formatCurrency(b.mrp)}</p>
                   </div>
                 </div>
                 
                 <div className="flex justify-end pt-2 border-t border-slate-100">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-500 mb-1">QTY</span>
                        <QuantityStepper value={item?.quantity || 0} onChange={(v) => updateQuantity(activeProduct, b, v)} />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-600 mb-1">FREE</span>
                        <FreeQuantityStepper value={item?.freeQuantity || 0} onChange={(v) => updateFreeQuantity(activeProduct, b, v)} />
                      </div>
                    </div>
                 </div>
               </div>
             )"""

batch_modal_new = """      <Dialog isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Select Batch" description={activeProduct?.productName}>
        <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
          {activeProduct?.batches?.map(b => {
             const cartKey = `${activeProduct.id}_${b.id}`;
             const item = cart[cartKey];
             const isExpired = b.expiryDate ? new Date(b.expiryDate) < new Date() : false;
             const isNearExpiry = !isExpired && b.expiryDate ? new Date(b.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 90)) : false;

             return (
               <div key={b.id} className={`border rounded-xl p-3 bg-white ${isExpired ? 'border-red-200 bg-red-50/30' : isNearExpiry ? 'border-amber-200' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Batch: {b.batchNo || 'N/A'}</p>
                     <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap mt-0.5">
                       <span>Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                       <span className="mx-1">•</span> 
                       <span>Stock: <span className={b.stockQty > 0 ? "text-slate-800 font-bold" : "text-red-500 font-bold"}>{b.stockQty}</span></span>
                       {isExpired && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold uppercase rounded flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Expired</span>}
                       {isNearExpiry && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Near Expiry</span>}
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-shreeji-blue">PTR: {formatCurrency(b.ptr)}</p>
                     <p className="text-xs text-slate-400 line-through">MRP: {formatCurrency(b.mrp)}</p>
                   </div>
                 </div>
                 
                 <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                    <div className="flex gap-4">
                      {isExpired ? (
                        <p className="text-xs font-bold text-red-500 py-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Cannot order expired stock
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500 mb-1">QTY</span>
                            <QuantityStepper value={item?.quantity || 0} onChange={(v) => updateQuantity(activeProduct, b, v)} />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-emerald-600 mb-1">FREE</span>
                            <FreeQuantityStepper value={item?.freeQuantity || 0} onChange={(v) => updateFreeQuantity(activeProduct, b, v)} />
                          </div>
                        </>
                      )}
                    </div>
                 </div>
               </div>
             )"""

content = content.replace(batch_modal_old, batch_modal_new)

with open("src/app/salesman/orders/create/page.tsx", "w") as f:
    f.write(content)
