/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
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
const DEPENDENT_DEDUCTION = 6200000;
const BASIC_SALARY_BASE = 2530000; 
const MAX_SI_HI_SALARY = BASIC_SALARY_BASE * 20; 

// Unemployment Insurance (BHTN) Max Salary for 2026 (Projected)
const MAX_UI_SALARY_REGIONS = {
  region1: 5310000 * 20, // 106.200.000
  region2: 4730000 * 20, // 94.600.000
  region3: 4140000 * 20, // 82.800.000
  region4: 3700000 * 20, // 74.000.000
};

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

// --- Translations ---
const translations = {
  vi: {
    title: "Tính Thuế TNCN",
    subtitle: "Quy định mới nhất về giảm trừ gia cảnh 2026",
    contractType: "Loại hợp đồng",
    official: "Chính thức (Cư trú)",
    contractor: "Thử việc / CTV (Cư trú)",
    nonResident: "Không cư trú",
    incomeInfo: "Thông tin thu nhập",
    mainSalary: "Lương chính (Đóng BHXH)",
    lunch: "Ăn trưa",
    phone: "Điện thoại",
    gas: "Xăng dầu",
    attendance: "Chuyên cần",
    living: "Sinh hoạt",
    fixedPerformance: "Thưởng hiệu suất cố định",
    otherIncome: "Thu nhập/ Thưởng khác (Gross)",
    netGift: "Thưởng Net (Công ty trả thuế)",
    dependents: "Số người phụ thuộc",
    subject: "Đối tượng",
    region: "Vùng",
    vn: "VN",
    nn: "NN",
    totalGross: "Tổng thu nhập gross (chưa gồm thưởng net)",
    ruleButton: "Quy định thuế 2026",
    taxableIncome: "Thu nhập chịu thuế",
    finalTaxableBase: "Thu nhập tính thuế",
    employerCost: "Chi phí Doanh nghiệp (Total Cost)",
    pit: "Thuế TNCN",
    insuranceEmployee: "Bảo hiểm bắt buộc (NV)",
    netSalary: "Thực nhận (Net)",
    calcDetails: "Chi tiết tính toán",
    taxLevelItem: "Bậc thuế / Khoản chi",
    descriptionRate: "Mô tả / Tỷ lệ",
    amount: "Số tiền",
    insuranceMandatory: "Bảo hiểm bắt buộc",
    taxLevel: "Bậc",
    noTax: "Thu nhập chưa đạt ngưỡng chịu thuế.",
    footerNote: "Dữ liệu tính toán dựa vào Luật số: 109/2025/QH15 về LUẬT THUẾ THU NHẬP CÁ NHÂN.",
    modalTitle: "Quy định từ năm 2026",
    personalDeduction: "Giảm trừ Bản thân",
    dependentDeduction: "Giảm trừ Phụ thuộc",
    taxTableTitle: "Biểu thuế lũy tiến 5 bậc 2026",
    modalSubjectTitle: "Đối tượng áp dụng",
    modalSubject1: "Chính thức: Biểu thuế lũy tiến 5 bậc (5% - 35%)",
    modalSubject2: "Thử việc/CTV: Thuế suất toàn phần 10%",
    modalSubject3: "Không cư trú: Thuế suất toàn phần 20%",
    incomeMillion: "Thu nhập (Triệu)",
    taxRate: "Thuế suất",
    modalClose: "Đồng ý",
    upTo: "Đến",
    fromTo: "Từ {min} đến {max}",
    over: "Trên",
    million: "triệuđ",
    flatTaxRate: "Thuế suất toàn phần",
    views: "lượt xem",
    otherExempt: "Miễn thuế khác",
    newRuleTitle: "Cập nhật từ 01/07/2026",
    newRule1: "Mức tiền ăn trưa miễn thuế tối đa tăng lên 1,200,000đ/tháng.",
    newRule2: "Lương tối thiểu chung (cơ sở) tăng lên 2,530,000đ/tháng.",
    probation85: "Nhận 85% lương",
  },
  en: {
    title: "PIT Calculator",
    subtitle: "Latest PIT regulations 2026",
    contractType: "Contract Type",
    official: "Official Resident",
    contractor: "Contractor/Probation",
    nonResident: "Non-resident",
    incomeInfo: "Income Information",
    mainSalary: "Main Salary (Insurance base)",
    lunch: "Lunch Allowance",
    phone: "Phone Allowance",
    gas: "Gasoline Allowance",
    attendance: "Attendance Allowance",
    living: "Living Allowance",
    fixedPerformance: "Fixed Performance Bonus",
    otherIncome: "Other Income (Gross)",
    netGift: "Net Bonus (Tax-paid)",
    dependents: "Dependents",
    subject: "Nationality",
    region: "Region",
    vn: "VN",
    nn: "Foreigner",
    totalGross: "Total Gross (Excl. Net Bonus)",
    ruleButton: "Tax Regulations 2026",
    taxableIncome: "Taxable Income (Gross - Exemptions)",
    finalTaxableBase: "Final Taxable Base (After Deductions)",
    employerCost: "Employer Total Cost",
    pit: "PIT (Income Tax)",
    insuranceEmployee: "Mandatory Insurance (EE)",
    netSalary: "Net Salary (Take-home)",
    calcDetails: "Calculation Details",
    taxLevelItem: "Tax Item / Bracket",
    descriptionRate: "Description / Rate",
    amount: "Amount",
    insuranceMandatory: "Mandatory Insurance",
    taxLevel: "Bracket",
    noTax: "Income is below the taxable threshold.",
    footerNote: "Calculation based on Law No: 109/2025/QH15 on PERSONAL INCOME TAX.",
    modalTitle: "Regulations 2026",
    personalDeduction: "Personal Deduction",
    dependentDeduction: "Dependent Deduction",
    taxTableTitle: "5-Tier Progressive Tax 2026",
    modalSubjectTitle: "Applicable Subjects",
    modalSubject1: "Official: Progressive 5-tier (5% - 35%)",
    modalSubject2: "Contractor/Probation: Flat 10% rate",
    modalSubject3: "Non-resident: Flat 20% rate",
    incomeMillion: "Income (Million)",
    taxRate: "Tax Rate",
    modalClose: "Close",
    upTo: "Up to",
    fromTo: "{min} to {max}",
    over: "Over",
    million: "M",
    flatTaxRate: "Flat Tax Rate",
    views: "views",
    otherExempt: "Other Tax-Free",
    newRuleTitle: "Updates from July 1, 2026",
    newRule1: "Max tax-free lunch allowance increases to 1,200,000 VND/month.",
    newRule2: "General minimum wage increases to 2,530,000 VND/month.",
    probation85: "Receive 85% salary",
  }
};

export default function App() {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const t = translations[lang];

  const [contractType, setContractType] = useState<ContractType>(ContractType.OFFICIAL_RESIDENT);
  const [mainSalary, setMainSalary] = useState<number>(0);
  const [dependents, setDependents] = useState<number>(0);
  const [isForeigner, setIsForeigner] = useState<boolean>(false);
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [netGift, setNetGift] = useState<number>(0);
  const [region, setRegion] = useState<"region1" | "region2" | "region3" | "region4">("region1");
  const [showExplanation, setShowExplanation] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [isProbation85, setIsProbation85] = useState(false);

  useEffect(() => {
    // Basic hit counter using counterapi.dev
    // This is a zero-config way to show total visits
    fetch("https://api.counterapi.dev/v1/pit-calculator-2026-hana/visits/up")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setViewCount(data.count);
        }
      })
      .catch(err => console.error("Counter error:", err));
  }, []);

  const formatInput = (val: number) => {
    return val.toLocaleString("vi-VN");
  };

  const parseInput = (val: string) => {
    const num = Number(val.replace(/\./g, ""));
    return isNaN(num) ? 0 : num;
  };

  // Allowances state
  const [allowances, setAllowances] = useState({
    phone: 0,
    lunch: 0,
    gas: 0,
    attendance: 0,
    living: 0,
    performance: 0,
    otherExempt: 0
  });

  const grossUpNetToGross = (netTaxableValue: number) => {
    if (netTaxableValue <= 0) return 0;
    const netM = netTaxableValue / 1000000;
    let grossM = 0;

    if (netM <= 9.5) {
      grossM = netM / 0.95;
    } else if (netM <= 27.5) {
      grossM = (netM - 0.5) / 0.9;
    } else if (netM <= 51.5) {
      grossM = (netM - 3.5) / 0.8;
    } else if (netM <= 79.5) {
      grossM = (netM - 9.5) / 0.7;
    } else {
      grossM = (netM - 14.5) / 0.65;
    }

    return grossM * 1000000;
  };

  const computedMultiplier = (contractType === ContractType.CONTRACTOR_RESIDENT && isProbation85) ? 0.85 : 1;

  const totalGrossManual = useMemo(() => {
    return (mainSalary + Object.values(allowances).reduce((a: number, b: number) => a + b, 0) + otherIncome) * computedMultiplier;
  }, [mainSalary, allowances, otherIncome, computedMultiplier]);

  const results = useMemo(() => {
    let incomeAfterExemptions = 0;
    let finalTaxableBase = 0;
    let totalInsuranceEmployee = 0;
    let employerInsurance = 0;
    let pit = 0;
    const breakdown: { range: string; rate: string; amount: number }[] = [];

    const computedMainSalary = mainSalary * computedMultiplier;
    const computedAllowances = {
      lunch: allowances.lunch * computedMultiplier,
      phone: allowances.phone * computedMultiplier,
      gas: allowances.gas * computedMultiplier,
      attendance: allowances.attendance * computedMultiplier,
      living: allowances.living * computedMultiplier,
      performance: allowances.performance * computedMultiplier,
      otherExempt: allowances.otherExempt * computedMultiplier,
    };
    const computedOtherIncome = otherIncome * computedMultiplier;
    const computedNetGift = netGift * computedMultiplier;

    // 1. Calculate Exempt Income
    let exemptIncome = 0;
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      const exemptLunch = Math.min(computedAllowances.lunch, 1200000);
      const exemptPhone = computedAllowances.phone;
      exemptIncome = exemptLunch + exemptPhone + computedAllowances.otherExempt;
    }

    // 2. Base calculation (Insurance & Base TNTT Gross)
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      const si = Math.min(computedMainSalary, MAX_SI_HI_SALARY) * (isForeigner ? SI_RATE_FOREIGN : SI_RATE_LOCAL);
      const hi = Math.min(computedMainSalary, MAX_SI_HI_SALARY) * (isForeigner ? HI_RATE_FOREIGN : HI_RATE_LOCAL);
      const ui = Math.min(computedMainSalary, MAX_UI_SALARY_REGIONS[region]) * (isForeigner ? UI_RATE_FOREIGN : UI_RATE_LOCAL);
      totalInsuranceEmployee = si + hi + ui;

      // Employer Insurance (Split because of different ceilings)
      const erSiHiRate = isForeigner ? (0.175 + 0.03) : (0.175 + 0.03); // Both 20.5%
      const erUiRate = isForeigner ? 0 : 0.01; // Foreigners normally don't pay UI in VN
      
      const erSiHi = Math.min(computedMainSalary, MAX_SI_HI_SALARY) * erSiHiRate;
      const erUi = Math.min(computedMainSalary, MAX_UI_SALARY_REGIONS[region]) * erUiRate;
      employerInsurance = erSiHi + erUi;
    }

    const totalDeduction = PERSONAL_DEDUCTION + (dependents * DEPENDENT_DEDUCTION);
    
    // Initial taxable base (Gross) before Net Gift
    const baseIncomeSubjectToTax = totalGrossManual - exemptIncome;
    let initialTaxableBaseGross = 0;
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      initialTaxableBaseGross = Math.max(0, baseIncomeSubjectToTax - totalInsuranceEmployee - totalDeduction);
    } else {
      initialTaxableBaseGross = totalGrossManual;
    }

    // Calculate initial tax for base salary to find "Initial TNTT NET"
    let initialTax = 0;
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      for (let i = 0; i < TAX_BRACKETS_2026.length; i++) {
        const b = TAX_BRACKETS_2026[i];
        const prevLimit = i === 0 ? 0 : TAX_BRACKETS_2026[i - 1].limit;
        if (initialTaxableBaseGross > prevLimit) {
          initialTax += (Math.min(initialTaxableBaseGross, b.limit) - prevLimit) * b.rate;
        }
      }
    } else {
      const rate = contractType === ContractType.CONTRACTOR_RESIDENT ? 0.1 : 0.2;
      initialTax = initialTaxableBaseGross * rate;
    }
    
    const initialTaxableBaseNet = initialTaxableBaseGross - initialTax;

    // 3. Gross up the combined Net
    const targetTotalTaxableNet = initialTaxableBaseNet + computedNetGift;
    let totalTaxableGross = 0;
    
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      totalTaxableGross = grossUpNetToGross(targetTotalTaxableNet);
    } else {
      const flatRate = contractType === ContractType.CONTRACTOR_RESIDENT ? 0.1 : 0.2;
      totalTaxableGross = targetTotalTaxableNet / (1 - flatRate);
    }

    // Subtract the initial gross to find how much gross for the net gift
    const grossOfNetGift = Math.max(0, totalTaxableGross - initialTaxableBaseGross);

    // Final Numbers
    finalTaxableBase = totalTaxableGross;
    incomeAfterExemptions = baseIncomeSubjectToTax + grossOfNetGift;
    const trueTotalGross = totalGrossManual + grossOfNetGift;

    // 4. Detailed PIT breakdown
    if (contractType === ContractType.OFFICIAL_RESIDENT) {
      if (finalTaxableBase > 0) {
        for (let i = 0; i < TAX_BRACKETS_2026.length; i++) {
          const current = TAX_BRACKETS_2026[i];
          const prevLimit = i === 0 ? 0 : TAX_BRACKETS_2026[i - 1].limit;
          if (finalTaxableBase > prevLimit) {
            const amountInRange = Math.min(finalTaxableBase, current.limit) - prevLimit;
            const taxInRange = amountInRange * current.rate;
            pit += taxInRange;
            breakdown.push({ 
              range: `${(prevLimit / 1000000)}M - ${current.limit === Infinity ? "++" : (current.limit / 1000000) + "M"}`, 
              rate: `${(current.rate * 100).toFixed(0)}%`, 
              amount: taxInRange 
            });
          }
        }
      }
    } else {
      const rate = contractType === ContractType.CONTRACTOR_RESIDENT ? 0.1 : 0.2;
      pit = finalTaxableBase * rate;
      breakdown.push({ range: "Flat Rate", rate: `${(rate * 100).toFixed(0)}%`, amount: pit });
    }

    const netSalary = trueTotalGross - totalInsuranceEmployee - pit;
    const employerCost = trueTotalGross + employerInsurance;

    return {
      totalInsuranceEmployee,
      employerInsurance,
      incomeAfterExemptions,
      finalTaxableBase,
      pit,
      netSalary,
      employerCost,
      grossOfNetGift,
      trueTotalGross,
      breakdown
    };
  }, [contractType, mainSalary, totalGrossManual, netGift, dependents, allowances, isForeigner, region]);

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
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {t.title} <span className="text-blue-600">2026</span>
                <span className="text-[10px] text-slate-300 font-medium ml-2 tracking-normal lowercase opacity-70">by hana do</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
              <button 
                onClick={() => setLang('vi')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${lang === 'vi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >VN</button>
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${lang === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >EN</button>
            </div>

            <div className="hidden md:flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-hidden h-fit">
              {[ContractType.OFFICIAL_RESIDENT, ContractType.CONTRACTOR_RESIDENT, ContractType.NON_RESIDENT].map((type) => (
                <button
                  key={type}
                  onClick={() => setContractType(type)}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-all ${
                    contractType === type 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {type === ContractType.OFFICIAL_RESIDENT ? t.official : type === ContractType.CONTRACTOR_RESIDENT ? t.contractor : t.nonResident}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Contract Switcher */}
          <div className="lg:hidden flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
            {[ContractType.OFFICIAL_RESIDENT, ContractType.CONTRACTOR_RESIDENT, ContractType.NON_RESIDENT].map((type) => (
              <button
                key={type}
                onClick={() => setContractType(type)}
                className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded whitespace-nowrap ${
                  contractType === type 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-slate-500"
                }`}
              >
                {type === ContractType.OFFICIAL_RESIDENT ? t.official : type === ContractType.CONTRACTOR_RESIDENT ? t.contractor : t.nonResident}
              </button>
            ))}
          </div>

          {/* Inputs Section */}
          <section className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                {t.incomeInfo}
              </h2>
              {contractType === ContractType.CONTRACTOR_RESIDENT && (
                <div className="flex items-center gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100 mt-2">
                  <input
                    type="checkbox"
                    id="probation85"
                    checked={isProbation85}
                    onChange={(e) => setIsProbation85(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="probation85" className="text-sm font-semibold text-blue-900 cursor-pointer select-none">
                    {t.probation85}
                  </label>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">{t.mainSalary}</label>
                    {totalGrossManual > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {((mainSalary * computedMultiplier) / totalGrossManual * 100).toFixed(1)}% Gross
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatInput(mainSalary)}
                      onChange={(e) => setMainSalary(parseInput(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-4 pr-12 text-base font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-400 font-bold text-sm">VND</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.lunch}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.lunch)}
                      onChange={(e) => handleAllowanceChange("lunch", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.phone}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.phone)}
                      onChange={(e) => handleAllowanceChange("phone", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.gas}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.gas)}
                      onChange={(e) => handleAllowanceChange("gas", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.attendance}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.attendance)}
                      onChange={(e) => handleAllowanceChange("attendance", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.living}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.living)}
                      onChange={(e) => handleAllowanceChange("living", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.fixedPerformance}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.performance)}
                      onChange={(e) => handleAllowanceChange("performance", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.otherExempt}</label>
                    <input
                      type="text"
                      value={formatInput(allowances.otherExempt)}
                      onChange={(e) => handleAllowanceChange("otherExempt", parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block min-h-[20px] leading-tight">{t.otherIncome}</label>
                    <input
                      type="text"
                      value={formatInput(otherIncome)}
                      onChange={(e) => setOtherIncome(parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-orange-200 bg-orange-50/30 rounded-lg text-sm font-bold focus:ring-orange-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block min-h-[20px] leading-tight">{t.netGift}</label>
                    <input
                      type="text"
                      value={formatInput(netGift)}
                      onChange={(e) => setNetGift(parseInput(e.target.value))}
                      className="w-full px-3 py-2 border border-teal-200 bg-teal-50/30 rounded-lg text-sm font-bold focus:ring-teal-500 transition-all"
                    />
                  </div>
                </div>

                {contractType === ContractType.OFFICIAL_RESIDENT && (
                  <div className="grid grid-cols-2 gap-4 items-end pt-2 border-t border-slate-200">
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{t.region}</span>
                        </div>
                        <select 
                          value={region}
                          onChange={(e) => setRegion(e.target.value as any)}
                          className="w-full py-1.5 text-[10px] font-bold rounded bg-slate-100 border border-slate-200 text-slate-600 px-2 focus:ring-0 focus:border-slate-300 h-[34px]"
                        >
                          <option value="region1">Vùng I (106.2M)</option>
                          <option value="region2">Vùng II (94.6M)</option>
                          <option value="region3">Vùng III (82.8M)</option>
                          <option value="region4">Vùng IV (74.0M)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{t.subject}</span>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-[34px]">
                          <button 
                            onClick={() => setIsForeigner(false)}
                            className={`flex-1 text-[10px] font-bold rounded ${!isForeigner ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                          >{t.vn}</button>
                          <button 
                            onClick={() => setIsForeigner(true)}
                            className={`flex-1 text-[10px] font-bold rounded ${isForeigner ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                          >{t.nn}</button>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1 mt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{t.dependents}</label>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-[34px]">
                        <button 
                          onClick={() => setDependents(Math.max(0, dependents - 1))}
                          className="w-10 h-full flex items-center justify-center bg-slate-50 border-r border-slate-200 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-500"
                        >-</button>
                        <input 
                          type="text"
                          value={formatInput(dependents)}
                          onChange={(e) => setDependents(parseInput(e.target.value))}
                          className="flex-1 text-center font-bold text-xs border-none focus:ring-0 p-0 h-full"
                        />
                        <button 
                          onClick={() => setDependents(dependents + 1)}
                          className="w-10 h-full flex items-center justify-center bg-slate-50 border-l border-slate-200 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-500"
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.totalGross}</span>
                  <span className="text-sm font-bold text-slate-800">{formatVND(totalGrossManual)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Total Gross (Final)</span>
                  <span className="text-xl font-bold text-blue-800">{formatVND(results.trueTotalGross)}</span>
                </div>
              </div>

              <button 
                onClick={() => setShowExplanation(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 group"
              >
                {t.ruleButton}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          {/* Results Section */}
          <section className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.taxableIncome}</p>
                <p className="text-xl font-bold text-slate-800">{formatVND(results.incomeAfterExemptions)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.finalTaxableBase}</p>
                <p className="text-xl font-bold text-blue-600">{formatVND(results.finalTaxableBase)}</p>
              </div>
              <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.employerCost}</p>
                <p className="text-xl font-bold text-slate-900">{formatVND(results.employerCost)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.pit}</p>
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
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.insuranceEmployee}</p>
                <p className="text-xl font-bold text-slate-700">{formatVND(results.totalInsuranceEmployee)}</p>
              </div>
              <div className="bg-blue-600 p-5 rounded-xl border border-blue-700 shadow-lg shadow-blue-100 col-span-1">
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1">{t.netSalary}</p>
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
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t.calcDetails}</h2>
                <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                  <span>Net/Gross:</span>
                  <span className="text-blue-600 tracking-tight font-black">{((results.netSalary / results.trueTotalGross) * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4">{t.taxLevelItem}</th>
                      <th className="px-6 py-4">{t.descriptionRate}</th>
                      <th className="px-6 py-4 text-right">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    {contractType === ContractType.OFFICIAL_RESIDENT && (
                      <>
                        <tr className="bg-slate-50/50">
                          <td className="px-6 py-4 font-semibold text-slate-800 not-italic">{t.insuranceMandatory} (NV)</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400 underline decoration-slate-300 decoration-dotted">{isForeigner ? '9.5%' : '10.5%'}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-700 not-italic">-{formatVND(results.totalInsuranceEmployee)}</td>
                        </tr>
                        <tr className="bg-slate-100/30">
                          <td className="px-6 py-4 font-semibold text-slate-600 not-italic">{t.insuranceMandatory} (Employer)</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{isForeigner ? '20.5%' : '21.5%'}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-500 not-italic">+{formatVND(results.employerInsurance)}</td>
                        </tr>
                        {results.grossOfNetGift > 0 && (
                          <tr className="bg-teal-50/50">
                            <td className="px-6 py-4 font-semibold text-teal-800 not-italic">{t.netGift} (Gross-up)</td>
                            <td className="px-6 py-4 text-xs font-bold text-teal-400">Net bonus: {formatVND(netGift)}</td>
                            <td className="px-6 py-4 text-right font-bold text-teal-700 not-italic">+{formatVND(results.grossOfNetGift)}</td>
                          </tr>
                        )}
                      </>
                    )}
                    {results.breakdown.length > 0 ? (
                      results.breakdown.map((item, idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/10"}`}>
                          <td className="px-6 py-4 font-medium text-slate-600 not-italic">
                            {contractType === ContractType.OFFICIAL_RESIDENT ? `${t.taxLevel} ${idx + 1}` : t.flatTaxRate}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-blue-500 bg-blue-50/30 rounded inline-block my-3 ml-6">{item.rate}</td>
                          <td className="px-6 py-4 text-right font-medium text-red-500 not-italic">{formatVND(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                          {t.noTax}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-blue-50 text-[11px] font-medium text-blue-700 flex justify-center items-center gap-2 border-t border-blue-100 text-center">
                <Info className="w-4 h-4" />
                {t.footerNote}
              </div>
            </div>
          </section>
        </main>

        <footer className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] py-8 mt-auto italic flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-200/50">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div>PIT Smart Engine v2.0 • Data Security Guaranteed</div>
            <div className="text-[9px] opacity-70">Crafted with precision by Hana Do</div>
          </div>
          {viewCount !== null && (
            <div className="flex items-center gap-1.5 opacity-60 bg-white/50 px-3 py-1 rounded-full border border-slate-200">
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
              <span>{viewCount.toLocaleString()} {t.views}</span>
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
            </div>
          )}
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
                <h3 className="text-xl font-bold text-slate-800">{t.modalTitle}</h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.personalDeduction}</p>
                    <p className="text-lg font-bold text-slate-800 text-right">15,500,000đ</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.dependentDeduction}</p>
                    <p className="text-lg font-bold text-slate-800 text-right">6,200,000đ</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-2">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trần BHXH/BHYT</p>
                      <p className="text-sm font-bold text-slate-800">50,600,000đ</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trần BHTN (Vùng I)</p>
                      <p className="text-sm font-bold text-slate-800">106,200,000đ</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">{t.taxTableTitle}</h4>
                  <div className="space-y-2">
                    {[
                      { range: `10 ${t.million}`, rate: "5%", type: "up" },
                      { range: `10 - 30 ${t.million}`, rate: "10%", type: "range", min: 10, max: 30 },
                      { range: `30 - 60 ${t.million}`, rate: "20%", type: "range", min: 30, max: 60 },
                      { range: `60 - 100 ${t.million}`, rate: "30%", type: "range", min: 60, max: 100 },
                      { range: `100 ${t.million}`, rate: "35%", type: "over" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-xs pb-2 border-b border-blue-100/50 last:border-none">
                        <span className="text-blue-900 font-medium">
                          {row.type === 'up' ? `${t.upTo} 10 ${t.million}` : 
                           row.type === 'over' ? `${t.over} 100 ${t.million}` :
                           t.fromTo.replace('{min}', row.min!.toString()).replace('{max}', row.max!.toString()) + ` ${t.million}`}
                        </span>
                        <span className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-700">{row.rate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                  <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    {t.newRuleTitle}
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm text-amber-900">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{t.newRule1}</span>
                    </li>
                    <li className="flex gap-2 text-sm text-amber-900">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{t.newRule2}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => setShowExplanation(false)}
                className="w-full mt-8 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-200"
              >
                {t.modalClose}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
