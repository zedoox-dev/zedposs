"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed path
import { 
  Receipt, Plus, Search, Loader2, X, Wallet, 
  MapPin, Calendar, TrendingDown, Tag 
} from "lucide-react";

export default function DailyExpensesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    category: "MAINTENANCE",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    outletId: ""
  });

  useEffect(() => {
    fetchExpenses();
    if (selectedOutlet !== "ALL") {
      setExpenseForm(prev => ({ ...prev, outletId: selectedOutlet }));
    }
  }, [selectedOutlet]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/expenses?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setExpenses(json.expenses);
    } catch (e) {
      console.error("Expense Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.outletId === "ALL" || !expenseForm.outletId) {
      return alert("Please select a specific branch to log this expense.");
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setShowAddModal(false);
        setExpenseForm({
          category: "MAINTENANCE",
          amount: "",
          description: "",
          date: new Date().toISOString().split('T')[0],
          outletId: selectedOutlet !== "ALL" ? selectedOutlet : ""
        });
        fetchExpenses();
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Failed to log expense");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Auditing Petty Cash Logs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Receipt className="mr-2 text-red-500" /> Daily Expenses (Kharcha)
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "HQ View: All Operational Expenses" : "Local Branch Petty Cash"}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-red-500/30 transition-all active:scale-95">
          <Plus className="mr-1.5" size={16} /> Log Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden text-red-900">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Total Money Out</span>
            <TrendingDown size={20} className="text-red-400"/>
          </div>
          <p className="text-4xl font-mono font-black">₹{totalExpenseAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Receipts Logged</span>
            <Receipt size={20} className="text-indigo-400"/>
          </div>
          <p className="text-4xl font-mono font-black text-slate-900">{expenses.length}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search by description or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Date / Branch</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Wallet size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Expenses Recorded</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-xs text-slate-800 font-black flex items-center">
                        <Calendar size={12} className="mr-1.5 text-slate-400"/>
                        {new Date(expense.date).toLocaleDateString('en-GB')}
                      </div>
                      {selectedOutlet === "ALL" && (
                        <div className="text-[10px] text-indigo-600 mt-1 uppercase tracking-widest font-black flex items-center">
                          <MapPin size={10} className="mr-1"/> {expense.outlet?.name}
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest border border-slate-200 font-black flex items-center w-fit">
                        <Tag size={10} className="mr-1"/> {expense.category.replace("_", " ")}
                      </span>
                    </td>
                    
                    <td className="p-4 text-xs font-bold text-slate-600">
                      {expense.description || "-"}
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-mono text-base font-black text-red-600">
                        ₹{expense.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="p-4 text-right text-[10px] uppercase text-slate-500 font-black">
                      {expense.loggedByUser?.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden border-t-8 border-red-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Receipt size={18} className="mr-2 text-red-500"/> Log Expense</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Record daily petty cash usage.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleLogExpense} className="space-y-4">
              
              {selectedOutlet === "ALL" && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Branch Location</label>
                  <select required value={expenseForm.outletId} onChange={(e) => setExpenseForm({...expenseForm, outletId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-red-500 bg-slate-50">
                    <option value="" disabled>Select Branch...</option>
                    {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Category</label>
                  <select required value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-red-500 bg-slate-50">
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="UTILITIES">Utilities (Light/Water)</option>
                    <option value="LOCAL_PURCHASE">Local Purchase</option>
                    <option value="MARKETING">Marketing/Promo</option>
                    <option value="STAFF_MEAL">Staff Meal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Date</label>
                  <input required type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-red-500 bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Amount (₹)</label>
                <input required type="number" min="1" step="0.5" placeholder="e.g. 500" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xl font-mono font-black focus:border-red-500 text-center" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Short Description</label>
                <input required type="text" placeholder="e.g. Plumber fee for sink repair" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-red-500 bg-slate-50" />
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Log Expense & Update P&L"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
