/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { 
  Calculator, 
  HelpCircle, 
  Info, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  Users, 
  ChevronRight,
  ArrowRight,
  Briefcase,
  Layers,
  Settings2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Constants (New Regulations 2026) ---
const PERSONAL_DEDUCTION = 15500000;
const DEPENDENT_DEDUCTION = 6600000;
const BASIC_SALARY_BASE = 2340000; 
const MAX_SI_HI_SALARY = BASIC_SALARY_BASE * 20; 
const MAX_UI_SALARY = 4960000 * 20; 

// Local Employee Rates
const SI_RATE_LOCAL = 0.08;
const HI_RATE_LOCAL = 0.015;
const UI_RATE_LOCAL = 0.01;
const EMPLOYER_SI_HI_UI_RATE_LOCAL = 0.175 + 0.03 + 0.01; // 21.5%

// Foreign Employee Rates (No UI)
const SI_RATE_FOREIGN = 0.08;
const HI_RATE_FOREIGN = 0.015;
const UI_RATE_FOREIGN = 0;
const EMPLOYER_SI_HI_UI_RATE_FOREIGN = 0.175 + 0.03; // 20.5%

// --- New 5-Level Progressive Tax (From Image) ---
const TAX_BRACKETS_2026 = [
  { limit: 10000000, rate: 0.05, subtract: 0 },
  { limit: 30000000, rate: 0.10, subtract: 500000 },
  { limit: 60000000, rate: 0.20, subtract: 3500000 },
  { limit: 100000000, rate: 0.30, subtract: 9500000 },
  { limit: Infinity, rate: 0.35, subtract: 14500000 },
];

enum ContractType {
  OFFICIAL_RESIDENT = "Chính thức (Cư trú)",
  CONTRACTOR_RESIDENT = "Thử việc / CTV (Cư trú)",
  NON_RESIDENT = "Không cư trú"
}

const formatVND = (num: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};

export default function App() {
  const [contractType, setContractType] = useState<ContractType>(ContractType.OFFICIAL_RESIDENT);
  const [mainSalary, setMainSalary] = useState<number>(25000000);
  const [dependents, setDependents] = useState<number>(0);
  const [isForeigner, setIsForeigner] = useState<boolean>(false);
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Allowances state
  const [allowances, setAllowances] = useState({
    phone: 500000,
    lunch: 730000,
    gas: 1000000,
    attendance: 500000,
    living: 2000000,
    performance: 3000000
  });

  const totalGross = useMemo(() => {
    return mainSalary + Object.values(allowances).reduce((a: number, b: number) => a + b, 0) + otherIncome;
  }, [mainSalary, allowances, otherIncome]);

  // --- Calculation Logic ---
  const results = useMemo(() => {
    let si = 0, hi = 0, ui = 0, totalInsuranceEmployee = 0;
    let employerInsurance = 0;
    let pit = 0;
    let incomeAfterExemptions = totalGross; // This corresponds to "Thu nhập chịu thuế"
    let finalTaxableBase = 0; // This corresponds to "Thu nhập tính thuế"
    
    const breakdown: { range: string; rate: string; amount: number }[] = [];

    // 1. Calculate Exempt Income (Only for Official contract)
    let exemptIncome = 0;
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      const exemptLunch = Math.min(allowances.lunch, 730000);
      const exemptPhone = allowances.phone;
      exemptIncome = exemptLunch + exemptPhone;
      
      // Thu nhập chịu thuế = Total Gross - Exemptions (Other income is fully taxable)
      incomeAfterExemptions = totalGross - exemptIncome;
    }

    // 2. Insurance (Only for Official contract)
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      const siRate = isForeigner ? SI_RATE_FOREIGN : SI_RATE_LOCAL;
      const hiRate = isForeigner ? HI_RATE_FOREIGN : HI_RATE_LOCAL;
      const uiRate = isForeigner ? UI_RATE_FOREIGN : UI_RATE_LOCAL;
      const erRate = isForeigner ? EMPLOYER_SI_HI_UI_RATE_FOREIGN : EMPLOYER_SI_HI_UI_RATE_LOCAL;

      si = Math.min(mainSalary, MAX_SI_HI_SALARY) * siRate;
      hi = Math.min(mainSalary, MAX_SI_HI_SALARY) * hiRate;
      ui = Math.min(mainSalary, MAX_UI_SALARY) * uiRate;
      totalInsuranceEmployee = si + hi + ui;

      // Employer insurance
      const employerSiHi = Math.min(mainSalary, MAX_SI_HI_SALARY) * (isForeigner ? 0.205 : 0.205); // Simplified below
      // Actually per logic provided: 21.5% local, 20.5% foreign
      employerInsurance = Math.min(mainSalary, MAX_SI_HI_SALARY) * erRate;
    }

    // 3. PIT Calculation
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      const totalDeduction = PERSONAL_DEDUCTION + (dependents * DEPENDENT_DEDUCTION);
      // Thu nhập tính thuế = Thu nhập chịu thuế - Bảo hiểm - Giảm trừ gia cảnh
      finalTaxableBase = Math.max(0, incomeAfterExemptions - totalInsuranceEmployee - totalDeduction);

      if (finalTaxableBase > 0) {
        for (let i = 0; i < TAX_BRACKETS_2026.length; i++) {
          const current = TAX_BRACKETS_2026[i];
          const prevLimit = i === 0 ? 0 : TAX_BRACKETS_2026[i - 1].limit;

          if (finalTaxableBase > prevLimit) {
            const amountInRange = Math.min(finalTaxableBase, current.limit) - prevLimit;
            const taxInRange = amountInRange * current.rate;
            pit += taxInRange;
            
            breakdown.push({
              range: `${formatVND(prevLimit)} - ${current.limit === Infinity ? "Trở lên" : formatVND(current.limit)}`,
              rate: `${(current.rate * 100).toFixed(0)}%`,
              amount: taxInRange
            });
          }
        }
      }
    } else if (contractType === ContractType.CONTRACTOR_RESIDENT) {
      finalTaxableBase = totalGross;
      pit = totalGross * 0.1;
      breakdown.push({ range: "Toàn phần", rate: "10%", amount: pit });
    } else {
      finalTaxableBase = totalGross;
      pit = totalGross * 0.2;
      breakdown.push({ range: "Toàn phần", rate: "20%", amount: pit });
    }

    const netSalary = totalGross - totalInsuranceEmployee - pit;
    const employerCost = totalGross + employerInsurance;

    return {
      si, hi, ui, 
      totalInsuranceEmployee,
      employerInsurance,
      incomeAfterExemptions,
      finalTaxableBase,
      pit,
      netSalary,
      employerCost,
      breakdown
    };
  }, [contractType, mainSalary, totalGross, dependents, allowances, isForeigner]);

  const handleAllowanceChange = (key: keyof typeof allowances, val: number) => {
    setAllowances(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-300">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-lg text-white shadow-sm shadow-blue-200">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tính Thuế TNCN <span className="text-blue-600">2026</span></h1>
              <p className="text-sm text-slate-500 font-medium">Quy định mới nhất về giảm trừ gia cảnh 2026</p>
            </div>
          </div>
          <div className="hidden md:flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-hidden h-fit">
            {Object.values(ContractType).map((type) => (
              <button
                key={type}
                onClick={() => setContractType(type)}
                className={`px-4 py-2 text-xs font-semibold rounded transition-all ${
                  contractType === type 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Contract Switcher */}
          <div className="lg:hidden flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
            {Object.values(ContractType).map((type) => (
              <button
                key={type}
                onClick={() => setContractType(type)}
                className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded whitespace-nowrap ${
                  contractType === type 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-slate-500"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Inputs Section */}
          <section className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                Thông tin thu nhập
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Lương chính (Đóng BHXH)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={mainSalary}
                      onChange={(e) => setMainSalary(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg py-3 pl-4 pr-12 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-slate-400 font-bold">VND</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ăn trưa</label>
                    <input
                      type="number"
                      value={allowances.lunch}
                      onChange={(e) => handleAllowanceChange("lunch", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điện thoại</label>
                    <input
                      type="number"
                      value={allowances.phone}
                      onChange={(e) => handleAllowanceChange("phone", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Xăng dầu</label>
                    <input
                      type="number"
                      value={allowances.gas}
                      onChange={(e) => handleAllowanceChange("gas", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên cần</label>
                    <input
                      type="number"
                      value={allowances.attendance}
                      onChange={(e) => handleAllowanceChange("attendance", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sinh hoạt</label>
                    <input
                      type="number"
                      value={allowances.living}
                      onChange={(e) => handleAllowanceChange("living", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thưởng hiệu suất cố định</label>
                    <input
                      type="number"
                      value={allowances.performance}
                      onChange={(e) => handleAllowanceChange("performance", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-orange-500 uppercase tracking-wider">Thu nhập/ Thưởng khác</label>
                    <input
                      type="number"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-orange-200 bg-orange-50/30 rounded-lg text-sm font-bold focus:ring-orange-500 transition-all"
                    />
                  </div>
                </div>

                {contractType === ContractType.OFFICIAL_RESIDENT && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 uppercase">Đối tượng</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsForeigner(false)}
                          className={`px-3 py-1 text-[10px] font-bold rounded border ${!isForeigner ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >VN</button>
                        <button 
                          onClick={() => setIsForeigner(true)}
                          className={`px-3 py-1 text-[10px] font-bold rounded border ${isForeigner ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >NN</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Số người phụ thuộc</label>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setDependents(Math.max(0, dependents - 1))}
                          className="w-10 h-10 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-bold"
                        >-</button>
                        <input 
                          type="number"
                          value={dependents}
                          onChange={(e) => setDependents(Math.max(0, Number(e.target.value)))}
                          className="flex-1 text-center font-bold border border-slate-300 rounded-lg py-2"
                        />
                        <button 
                          onClick={() => setDependents(dependents + 1)}
                          className="w-10 h-10 flex items-center justify-center border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-bold"
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Gross</span>
                  <span className="text-xl font-bold text-slate-800">{formatVND(totalGross)}</span>
                </div>
              </div>

              <button 
                onClick={() => setShowExplanation(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 group"
              >
                Quy định thuế 2026
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          {/* Results Section */}
          <section className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thu nhập chịu thuế</p>
                <p className="text-xl font-bold text-slate-800">{formatVND(results.incomeAfterExemptions)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thu nhập tính thuế</p>
                <p className="text-xl font-bold text-blue-600">{formatVND(results.finalTaxableBase)}</p>
              </div>
              <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chi phí Doanh nghiệp (Total Cost)</p>
                <p className="text-xl font-bold text-slate-900">{formatVND(results.employerCost)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thuế TNCN</p>
                <motion.p 
                  key={results.pit}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-xl font-bold text-red-600"
                >
                  {formatVND(results.pit)}
                </motion.p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bảo hiểm bắt buộc (NV)</p>
                <p className="text-xl font-bold text-slate-700">{formatVND(results.totalInsuranceEmployee)}</p>
              </div>
              <div className="bg-blue-600 p-5 rounded-xl border border-blue-700 shadow-lg shadow-blue-100 col-span-1">
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1">Thực nhận (Net)</p>
                <motion.p 
                   key={results.netSalary}
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="text-xl font-bold text-white"
                >
                  {formatVND(results.netSalary)}
                </motion.p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Chi tiết tính toán</h2>
                <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                  <span>Net/Gross:</span>
                  <span className="text-blue-600 tracking-tight font-black">{((results.netSalary / totalGross) * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4">Bậc thuế / Khoản chi</th>
                      <th className="px-6 py-4">Mô tả / Tỷ lệ</th>
                      <th className="px-6 py-4 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    {contractType === ContractType.OFFICIAL_RESIDENT && (
                      <>
                        <tr className="bg-slate-50/50">
                          <td className="px-6 py-4 font-semibold text-slate-800 not-italic">Bảo hiểm bắt buộc (NV)</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400 underline decoration-slate-300 decoration-dotted">{isForeigner ? '9.5%' : '10.5%'} Mức trần</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-700 not-italic">-{formatVND(results.totalInsuranceEmployee)}</td>
                        </tr>
                        <tr className="bg-slate-100/30">
                          <td className="px-6 py-4 font-semibold text-slate-600 not-italic">Bảo hiểm bắt buộc (Employer)</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{isForeigner ? '20.5%' : '21.5%'} Mức trần</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-500 not-italic">+{formatVND(results.employerInsurance)}</td>
                        </tr>
                      </>
                    )}
                    {results.breakdown.length > 0 ? (
                      results.breakdown.map((item, idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/10"}`}>
                          <td className="px-6 py-4 font-medium text-slate-600 not-italic">Bậc {idx + 1}</td>
                          <td className="px-6 py-4 text-xs font-bold text-blue-500 bg-blue-50/30 rounded inline-block my-3 ml-6">{item.rate}</td>
                          <td className="px-6 py-4 text-right font-medium text-red-500 not-italic">{formatVND(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                          Thu nhập chưa đạt ngưỡng chịu thuế.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-blue-50 text-[11px] font-medium text-blue-700 flex justify-center items-center gap-2 border-t border-blue-100 text-center">
                <Info className="w-4 h-4" />
                Dữ liệu tính toán dựa vào Luật số: 109/2025/QH15 về LUẬT THUẾ THU NHẬP CÁ NHÂN.
              </div>
            </div>
          </section>
        </main>

        <footer className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] py-4 mt-auto">
          PIT Smart Engine v2.0 • Data Security Guaranteed
        </footer>
      </div>

      {/* Modal Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-8 relative border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-slate-800 text-white p-2 rounded-lg">
                  <Settings2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Quy định từ năm 2026</h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Giảm trừ Bản thân</p>
                    <p className="text-lg font-bold text-slate-800 text-right">15,500,000đ</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Giảm trừ Phụ thuộc</p>
                    <p className="text-lg font-bold text-slate-800 text-right">6,600,000đ</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Biểu thuế lũy tiến 5 bậc 2026</h4>
                  <div className="space-y-2">
                    {[
                      { range: "Đến 10 triệuđ", rate: "5%" },
                      { range: "Từ 10 đến 30 triệuđ", rate: "10%" },
                      { range: "Từ 30 đến 60 triệuđ", rate: "20%" },
                      { range: "Từ 60 đến 100 triệuđ", rate: "30%" },
                      { range: "Trên 100 triệuđ", rate: "35%" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-xs pb-2 border-b border-blue-100/50 last:border-none">
                        <span className="text-blue-900 font-medium">{row.range}</span>
                        <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-700">{row.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowExplanation(false)}
                className="w-full mt-8 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-200"
              >
                Đồng ý
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
