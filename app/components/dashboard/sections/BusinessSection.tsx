"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BriefcaseBusiness, Calculator, ChevronDown, Download, Edit3,
  Landmark, LoaderCircle, Plus, ReceiptText, Save, Trash2,
} from "lucide-react";
import {
  createBusinessProfile,
  deleteBusinessRecurringCost,
  deleteBusinessScenario,
  deleteBusinessServiceTemplate,
  deleteBusinessTransaction,
  getBusinessWorkspace,
  saveBusinessRecurringCost,
  saveBusinessScenario,
  saveBusinessServiceTemplate,
  saveBusinessTransaction,
  updateBusinessProfile,
} from "../../../lib/business-api";
import {
  annualizeRecurringCosts,
  calculateBusinessSummary,
  calculateExpenseAmounts,
  calculateSalaryScenario,
  calculateSaleAmounts,
  calculateScenario,
} from "../../../lib/business/calculator";
import { formatOre, parseMoneyToOre } from "../../../lib/business/money";
import { BUSINESS_RULES_2026 } from "../../../lib/business/rules/2026";
import type {
  AmountEntryMode,
  BusinessProfile,
  BusinessProfileInput,
  BusinessScenarioAssumptions,
  BusinessTransaction,
  BusinessTransactionInput,
  BusinessTransactionKind,
  BusinessWorkspace,
  CompanyForm,
  PaymentStatus,
  PurchaseVatScope,
  VatRate,
  VatTreatment,
} from "../../../lib/business/types";

type BusinessTab = "overview" | "transactions" | "tax" | "withdrawal" | "forecast" | "settings";

const EMPTY_WORKSPACE: BusinessWorkspace = {
  profiles: [], transactions: [], serviceTemplates: [], recurringCosts: [], scenarios: [],
};

const EXPENSE_CATEGORIES = [
  "Lokal", "El", "Städning", "Försäkringar", "Boknings-/journalsystem", "Redovisning",
  "Bank-/kort-/Swishavgifter", "Behandlingsmaterial", "Telefon", "Marknadsföring", "Resor", "Utrustning", "Övrigt",
];

const TRANSACTION_LABELS: Record<BusinessTransactionKind, string> = {
  sale: "Försäljning", expense: "Driftskostnad", investment: "Investering", interest: "Ränta",
  loan_received: "Mottaget lån", loan_repayment: "Amortering", owner_deposit: "Egen insättning",
  owner_withdrawal: "Eget uttag", tax_payment: "Skattebetalning", salary_payment: "Löneutbetalning",
};

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

function defaultProfileInput(): BusinessProfileInput {
  return {
    name: "", company_form: "sole_trader", business_start: null, fiscal_year_start_month: 1,
    vat_registered: true, vat_period: "quarterly", accounting_method: "cash",
    licensed_healthcare_profile: false, bank_balance_ore: null, balance_date: null,
    opening_receivables_ore: 0, opening_payables_ore: 0, prior_year_revenue_ore: 0,
    prior_year_costs_ore: 0, paid_tax_ore: 0, birth_year: null, municipality: null,
    tax_table: null, tax_column: null, other_annual_income_ore: 0, withheld_tax_ore: 0,
    desired_private_monthly_ore: 0, buffer_ore: 0, buffer_months: 0, pension_ore: 0,
    weeks_off: 0, manual_annual_income_tax_ore: null, manual_verified_tax_debt_ore: null,
    manual_tax_adjustment_ore: 0,
  };
}

type TransactionForm = {
  kind: BusinessTransactionKind; date: string; category: string; description: string;
  amount: string; actualVat: string; vatTreatment: VatTreatment; vatRate: VatRate;
  amountEntry: AmountEntryMode; paymentStatus: PaymentStatus; paidAmount: string;
  dueDate: string; paidOn: string; purchaseScope: PurchaseVatScope; deductionPercent: string;
  allocationBasis: string;
  recurringCostId: string;
};

function defaultTransactionForm(): TransactionForm {
  return {
    kind: "sale", date: today(), category: "Behandling", description: "", amount: "",
    actualVat: "0", vatTreatment: "healthcare_exempt", vatRate: 2500, amountEntry: "inclusive",
    paymentStatus: "paid", paidAmount: "", dueDate: "", paidOn: today(), purchaseScope: "taxable",
    deductionPercent: "100", allocationBasis: "", recurringCostId: "",
  };
}

const DEFAULT_SCENARIO: BusinessScenarioAssumptions = {
  servicePriceOre: 80000, priceIncludesVat: true, vatRateBasisPoints: 2500,
  exemptSharePercent: 50, clientsPerWeek: 25, workingWeeks: 46,
  annualFixedCostsOre: 36000000, variableCostPerClientOre: 5000, desiredPrivateMonthlyOre: 3000000,
};

function fieldOre(value: string): number {
  const amount = parseMoneyToOre(value);
  if (amount === null) throw new Error("Ange ett giltigt belopp med högst två decimaler.");
  return amount;
}

function downloadCsv(profile: BusinessProfile, transactions: BusinessTransaction[]) {
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["datum", "typ", "kategori", "beskrivning", "netto_kr", "moms_kr", "brutto_kr", "betalstatus", "regelår"],
    ...transactions.map((item) => [
      item.occurred_on, TRANSACTION_LABELS[item.kind], item.category, item.description,
      (item.net_amount_ore / 100).toFixed(2), (item.vat_amount_ore / 100).toFixed(2),
      (item.gross_amount_ore / 100).toFixed(2), item.payment_status, item.rule_year,
    ]),
  ];
  const content = rows.map((row) => row.map(escape).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${profile.name.replace(/[^a-z0-9åäö]+/gi, "-").toLowerCase()}-${currentYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BusinessSection() {
  const [workspace, setWorkspace] = useState<BusinessWorkspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profileId, setProfileId] = useState("");
  const [tab, setTab] = useState<BusinessTab>("overview");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [showCalculation, setShowCalculation] = useState(false);
  const [profileForm, setProfileForm] = useState(defaultProfileInput);
  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);
  const [transactionError, setTransactionError] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [scenarioName, setScenarioName] = useState("Grundscenario");
  const [grossSalary, setGrossSalary] = useState("30000");
  const [salaryWithholding, setSalaryWithholding] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [recurringName, setRecurringName] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState("1");
  const [recurringNextDue, setRecurringNextDue] = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getBusinessWorkspace();
      setWorkspace(next);
      setProfileId((current) => current && next.profiles.some((item) => item.id === current)
        ? current : next.profiles[0]?.id ?? "");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Företagsdata kunde inte hämtas.";
      setError(message.includes("business_profiles")
        ? "Databasmigrationen för Företag behöver köras i Supabase innan sidan kan användas."
        : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const profile = workspace.profiles.find((item) => item.id === profileId) ?? null;
  const transactions = useMemo(
    () => workspace.transactions.filter((item) => item.profile_id === profileId),
    [workspace.transactions, profileId],
  );
  const recurringCosts = useMemo(
    () => workspace.recurringCosts.filter((item) => item.profile_id === profileId),
    [workspace.recurringCosts, profileId],
  );
  const from = period === "month" ? `${selectedMonth}-01` : `${selectedMonth.slice(0, 4)}-01-01`;
  const to = period === "month"
    ? new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).toISOString().slice(0, 10)
    : `${selectedMonth.slice(0, 4)}-12-31`;
  const summary = profile ? calculateBusinessSummary({ profile, transactions, recurringCosts, from, to }) : null;
  const recurringAnnualCostsOre = annualizeRecurringCosts(recurringCosts);
  const scenarioResult = profile ? calculateScenario(scenario, profile.company_form, recurringAnnualCostsOre) : null;
  const salaryScenario = profile?.company_form === "limited_company" && summary
    ? calculateSalaryScenario({
      grossSalaryOre: parseMoneyToOre(grossSalary) ?? 0,
      syntheticOrVerifiedWithholdingOre: salaryWithholding.trim() ? parseMoneyToOre(salaryWithholding) : null,
      birthYear: profile.birth_year,
      paymentDate: today(),
      resultBeforeSalaryOre: summary.resultBeforeTaxOre,
      corporateTaxPaidOre: profile.paid_tax_ore,
    }) : null;

  async function runSave(action: () => Promise<void>, success: string) {
    setSaving(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Det gick inte att spara."); }
    finally { setSaving(false); }
  }

  async function removeWithConfirmation(label: string, action: () => Promise<void>, success: string) {
    if (!window.confirm(`Vill du radera ${label}? Det går inte att ångra.`)) return;
    await runSave(action, success);
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (!profileForm.name.trim()) { setError("Företagsnamn krävs."); return; }
    await runSave(async () => {
      const created = await createBusinessProfile({ ...profileForm, name: profileForm.name.trim() });
      setProfileId(created.id); setProfileForm(defaultProfileInput());
    }, "Företagsprofilen skapades.");
  }

  function buildTransactionInput() {
    if (!profile) throw new Error("Välj en företagsprofil.");
    const enteredAmountOre = fieldOre(transactionForm.amount);
    if (enteredAmountOre <= 0) throw new Error("Beloppet måste vara större än noll.");
    const isSale = transactionForm.kind === "sale";
    const isExpense = ["expense", "investment", "interest", "salary_payment"].includes(transactionForm.kind);
    let netAmountOre = enteredAmountOre;
    let vatAmountOre = 0;
    let grossAmountOre = enteredAmountOre;
    let deductibleVatOre = 0;
    let incomeTaxDeductibleOre = 0;

    if (isSale) {
      const amounts = calculateSaleAmounts({
        enteredAmountOre, amountEntry: transactionForm.amountEntry,
        vatTreatment: transactionForm.vatTreatment,
        vatRateBasisPoints: transactionForm.vatTreatment === "healthcare_exempt" ? 0 : transactionForm.vatRate,
      });
      ({ netOre: netAmountOre, vatOre: vatAmountOre, grossOre: grossAmountOre } = amounts);
    } else if (isExpense) {
      const actualVatOre = fieldOre(transactionForm.actualVat || "0");
      const amounts = calculateExpenseAmounts({
        grossAmountOre: enteredAmountOre, actualVatOre,
        vatDeductionPercent: Number(transactionForm.deductionPercent),
      });
      netAmountOre = amounts.costBasisOre;
      vatAmountOre = actualVatOre;
      grossAmountOre = amounts.grossOre;
      deductibleVatOre = amounts.deductibleVatOre;
      incomeTaxDeductibleOre = amounts.costBasisOre;
    }

    const paidAmountOre = transactionForm.paymentStatus === "paid"
      ? grossAmountOre
      : transactionForm.paymentStatus === "partial" ? fieldOre(transactionForm.paidAmount || "0") : 0;
    return {
      profile_id: profile.id, occurred_on: transactionForm.date, kind: transactionForm.kind,
      category: transactionForm.category.trim() || "Övrigt", description: transactionForm.description.trim(),
      vat_treatment: isSale ? transactionForm.vatTreatment : null,
      vat_rate_basis_points: isSale && transactionForm.vatTreatment === "taxable" ? transactionForm.vatRate : 0 as VatRate,
      amount_entry: transactionForm.amountEntry, entered_amount_ore: enteredAmountOre,
      net_amount_ore: netAmountOre, vat_amount_ore: vatAmountOre, gross_amount_ore: grossAmountOre,
      deductible_vat_ore: deductibleVatOre, income_tax_deductible_ore: incomeTaxDeductibleOre,
      payment_status: transactionForm.paymentStatus, paid_amount_ore: paidAmountOre,
      due_date: transactionForm.dueDate || null,
      paid_on: transactionForm.paymentStatus === "unpaid" ? null : (transactionForm.paidOn || transactionForm.date),
      purchase_vat_scope: isExpense ? transactionForm.purchaseScope : null,
      vat_deduction_percent: isExpense ? Number(transactionForm.deductionPercent) : 0,
      allocation_basis: isExpense && transactionForm.purchaseScope === "mixed" ? transactionForm.allocationBasis.trim() || null : null,
      recurring_cost_id: transactionForm.recurringCostId || null,
      linked_private_purchase_id: null, rule_year: Number(transactionForm.date.slice(0, 4)),
    };
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    let input: BusinessTransactionInput;
    try {
      input = buildTransactionInput();
      setTransactionError("");
    } catch (validationError) {
      setTransactionError(validationError instanceof Error ? validationError.message : "Kontrollera uppgifterna.");
      return;
    }
    await runSave(async () => {
      await saveBusinessTransaction(input, editingTransactionId ?? undefined);
      setTransactionForm(defaultTransactionForm()); setEditingTransactionId(null);
    }, editingTransactionId ? "Affärshändelsen uppdaterades." : "Affärshändelsen sparades.");
  }

  function editTransaction(item: BusinessTransaction) {
    setTransactionError("");
    setEditingTransactionId(item.id);
    setTransactionForm({
      kind: item.kind, date: item.occurred_on, category: item.category, description: item.description,
      amount: String(item.entered_amount_ore / 100).replace(".", ","),
      actualVat: String(item.vat_amount_ore / 100).replace(".", ","),
      vatTreatment: item.vat_treatment ?? "taxable", vatRate: item.vat_rate_basis_points,
      amountEntry: item.amount_entry, paymentStatus: item.payment_status,
      paidAmount: String(item.paid_amount_ore / 100).replace(".", ","), dueDate: item.due_date ?? "",
      paidOn: item.paid_on ?? "", purchaseScope: item.purchase_vat_scope ?? "taxable",
      deductionPercent: String(item.vat_deduction_percent), allocationBasis: item.allocation_basis ?? "",
      recurringCostId: item.recurring_cost_id ?? "",
    });
    setTab("transactions");
  }

  function registerRecurringCost(recurringCost: BusinessWorkspace["recurringCosts"][number]) {
    setEditingTransactionId(null);
    setTransactionForm({
      ...defaultTransactionForm(),
      kind: "expense",
      date: recurringCost.next_due_date,
      category: recurringCost.category,
      description: recurringCost.name,
      amount: String(recurringCost.amount_ore / 100).replace(".", ","),
      dueDate: recurringCost.next_due_date,
      paidOn: recurringCost.next_due_date,
      recurringCostId: recurringCost.id,
    });
    setTab("transactions");
    setNotice(`${recurringCost.name} är förifylld. Kontrollera betalstatus och spara.`);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    await runSave(async () => {
      await updateBusinessProfile(profile.id, {
        name: String(form.get("name") ?? "").trim(),
        bank_balance_ore: parseMoneyToOre(String(form.get("bankBalance") ?? "")),
        balance_date: String(form.get("balanceDate") ?? "") || null,
        buffer_ore: fieldOre(String(form.get("buffer") ?? "0")),
        paid_tax_ore: fieldOre(String(form.get("paidTax") ?? "0")),
        manual_annual_income_tax_ore: String(form.get("annualTax") ?? "").trim()
          ? fieldOre(String(form.get("annualTax"))) : null,
        birth_year: String(form.get("birthYear") ?? "").trim() ? Number(form.get("birthYear")) : null,
        municipality: String(form.get("municipality") ?? "").trim() || null,
        accounting_method: String(form.get("accountingMethod")) as BusinessProfile["accounting_method"],
        vat_period: String(form.get("vatPeriod")) as BusinessProfile["vat_period"],
        licensed_healthcare_profile: form.get("healthcare") === "on",
      });
    }, "Inställningarna sparades.");
  }

  async function saveScenarioNow() {
    if (!profile) return;
    await runSave(async () => {
      await saveBusinessScenario({ profile_id: profile.id, name: scenarioName.trim() || "Scenario", assumptions: scenario });
    }, "Scenariot sparades separat från utfallet.");
  }

  if (loading) return <div className="business-state"><LoaderCircle className="spin"/> Hämtar företagsdata…</div>;

  if (!profile) {
    return (
      <div className="business-page">
        <article className="business-intro panel">
          <BriefcaseBusiness size={32}/><div><h3>Skapa din företagsprofil</h3><p>Företagets ekonomi hålls helt åtskild från din privata budget.</p></div>
        </article>
        {error && <div aria-live="assertive" className="business-message error" role="alert"><AlertTriangle size={16}/>{error}</div>}
        <form className="business-form panel" onSubmit={submitProfile}>
          <label><span>Företagsnamn</span><input required value={profileForm.name} onChange={(event) => setProfileForm((item) => ({ ...item, name: event.target.value }))}/></label>
          <label><span>Företagsform</span><select value={profileForm.company_form} onChange={(event) => setProfileForm((item) => ({ ...item, company_form: event.target.value as CompanyForm }))}><option value="sole_trader">Enskild firma</option><option value="limited_company">Aktiebolag</option></select></label>
          <label><span>Verksamhetsstart</span><input type="date" onChange={(event) => setProfileForm((item) => ({ ...item, business_start: event.target.value || null }))}/></label>
          <label><span>Redovisningsmetod</span><select value={profileForm.accounting_method} onChange={(event) => setProfileForm((item) => ({ ...item, accounting_method: event.target.value as BusinessProfile["accounting_method"] }))}><option value="cash">Kontantmetoden</option><option value="invoice">Fakturametoden</option></select></label>
          <label className="business-check"><input type="checkbox" checked={profileForm.licensed_healthcare_profile} onChange={(event) => setProfileForm((item) => ({ ...item, licensed_healthcare_profile: event.target.checked }))}/><span>Profil för legitimerad vård</span></label>
          <button disabled={saving} type="submit"><Plus size={16}/> Skapa Företag</button>
        </form>
        <p className="business-disclaimer">Detta är en ekonomisk sammanställning och planering – inte fullständig bokföring, deklaration eller patientjournal.</p>
      </div>
    );
  }

  const kpis = summary ? [
    ["Tillgängligt på konto", summary.availableCashOre === null ? "Saknas" : formatOre(summary.availableCashOre)],
    ["Intäkter", formatOre(summary.revenueOre)], ["Kostnader", formatOre(summary.costsOre)],
    ["Resultat före skatt", formatOre(summary.resultBeforeTaxOre)],
    ["Momsreserv", formatOre(summary.vatRemainingOre)],
    ["Skattereserv", summary.taxRemainingOre === null ? "Underlag saknas" : formatOre(summary.taxRemainingOre)],
    ["Obetalda kundfakturor", formatOre(summary.unpaidInvoicesOre)],
    ["Kommande betalningar", formatOre(summary.unpaidCommitmentsOre)],
  ] : [];

  return (
    <div className="business-page">
      <header className="business-toolbar panel">
        <div><span>Företagsprofil</span><select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{workspace.profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div><span>Period</span><select value={period} onChange={(event) => setPeriod(event.target.value as "month" | "year")}><option value="month">Månad</option><option value="year">Hittills/helår</option></select></div>
        <div><span>Inkomstår</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}/></div>
        <span className="business-form-badge">{profile.company_form === "sole_trader" ? "Enskild firma" : "Aktiebolag"}</span>
      </header>

      {(error || notice) && <div aria-live={error ? "assertive" : "polite"} className={`business-message ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || notice}</div>}

      <nav className="business-tabs" aria-label="Företagets avsnitt">
        {(["overview", "transactions", "tax", "withdrawal", "forecast", "settings"] as BusinessTab[]).map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)} type="button">
            {{ overview: "Översikt", transactions: "Registrering & historik", tax: "Skatt & moms", withdrawal: profile.company_form === "sole_trader" ? "Eget uttag" : "Lön", forecast: "Prognos", settings: "Inställningar" }[item]}
          </button>
        ))}
      </nav>

      {tab === "overview" && summary && (
        <>
          <section className="business-kpi-grid">{kpis.map(([label, value]) => <article className="panel" key={label}><span>{label}</span><strong>{value}</strong><small>{period === "month" ? selectedMonth : selectedMonth.slice(0, 4)} · faktiskt utfall</small></article>)}</section>
          <section className="business-focus-grid">
            <article className="business-available-card panel"><span>{profile.company_form === "sole_trader" ? "Beräknat utrymme för eget uttag" : "Likviditet före nytt lönescenario"}</span><strong>{summary.withdrawalSpaceOre === null ? "Saknar saldo" : formatOre(summary.withdrawalSpaceOre)}</strong>{summary.liquidityShortfallOre ? <p className="danger">Likviditetsbrist: {formatOre(summary.liquidityShortfallOre)}</p> : <p>Efter skatt, moms, åtaganden och driftbuffert.</p>}</article>
            <article className="panel business-reserve-card"><span>Vald driftbuffert</span><strong>{formatOre(profile.buffer_ore)}</strong><p>Bufferten är ett planeringsval och påverkar inte resultatet.</p></article>
          </section>
          <article className="business-explanation panel">
            <button onClick={() => setShowCalculation((value) => !value)} type="button"><span><Calculator size={17}/> Så räknade vi</span><ChevronDown size={17}/></button>
            {showCalculation && <div><p>Kontosaldo {summary.availableCashOre === null ? "saknas" : formatOre(summary.availableCashOre)} − skattereserv {summary.taxRemainingOre === null ? "okänd" : formatOre(summary.taxRemainingOre)} − momsreserv {formatOre(summary.vatRemainingOre)} − åtaganden {formatOre(summary.unpaidCommitmentsOre)} − buffert {formatOre(profile.buffer_ore)}.</p><p>Regelversion: Sverige 2026, kontrollerad {BUSINESS_RULES_2026.checkedOn}. Obetalda kundfakturor räknas inte som tillgängliga bankpengar.</p></div>}
          </article>
        </>
      )}

      {tab === "transactions" && (
        <div className="business-two-column">
          <form className="business-form panel" onSubmit={submitTransaction}>
            <h3>{editingTransactionId ? "Redigera affärshändelse" : "Ny affärshändelse"}</h3>
            {transactionError && <small className="business-help warning" role="alert">{transactionError}</small>}
            <label><span>Typ</span><select value={transactionForm.kind} onChange={(event) => setTransactionForm((item) => ({ ...item, kind: event.target.value as BusinessTransactionKind }))}>{Object.entries(TRANSACTION_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span>Datum</span><input required type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((item) => ({ ...item, date: event.target.value }))}/></label>
            <label><span>Kategori/tjänst</span><input list="business-categories" required value={transactionForm.category} onChange={(event) => setTransactionForm((item) => ({ ...item, category: event.target.value }))}/><datalist id="business-categories">{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</datalist></label>
            <label><span>Beskrivning (inga patientuppgifter)</span><input value={transactionForm.description} onChange={(event) => setTransactionForm((item) => ({ ...item, description: event.target.value }))}/></label>
            <label><span>Belopp</span><input aria-invalid={Boolean(transactionError)} required inputMode="decimal" value={transactionForm.amount} onChange={(event) => { setTransactionError(""); setTransactionForm((item) => ({ ...item, amount: event.target.value })); }}/></label>
            {transactionForm.kind === "sale" && <>
              <label><span>Momshantering</span><select value={transactionForm.vatTreatment} onChange={(event) => setTransactionForm((item) => ({ ...item, vatTreatment: event.target.value as VatTreatment }))}><option value="healthcare_exempt">Momsfri sjukvård</option><option value="taxable">Momspliktig försäljning</option></select></label>
              {transactionForm.vatTreatment === "taxable" && <label><span>Momssats</span><select value={transactionForm.vatRate} onChange={(event) => setTransactionForm((item) => ({ ...item, vatRate: Number(event.target.value) as VatRate }))}><option value={2500}>25 %</option><option value={1200}>12 %</option><option value={600}>6 %</option></select></label>}
              <label><span>Beloppet är</span><select value={transactionForm.amountEntry} onChange={(event) => setTransactionForm((item) => ({ ...item, amountEntry: event.target.value as AmountEntryMode }))}><option value="inclusive">Inklusive moms</option><option value="exclusive">Exklusive moms</option></select></label>
              <small className="business-help">Massage klassificeras inte automatiskt. Allmän friskvård är normalt momspliktig; vårdundantag kräver att den faktiska tjänsten uppfyller villkoren.</small>
            </>}
            {["expense", "investment", "interest", "salary_payment"].includes(transactionForm.kind) && <>
              <label><span>Faktisk moms på underlaget</span><input inputMode="decimal" value={transactionForm.actualVat} onChange={(event) => setTransactionForm((item) => ({ ...item, actualVat: event.target.value }))}/></label>
              <label><span>Inköpet hör till</span><select value={transactionForm.purchaseScope} onChange={(event) => setTransactionForm((item) => ({ ...item, purchaseScope: event.target.value as PurchaseVatScope }))}><option value="taxable">Momspliktig verksamhet</option><option value="exempt">Momsfri verksamhet</option><option value="mixed">Gemensam/blandad verksamhet</option></select></label>
              <label><span>Avdragsrätt för moms (%)</span><input min="0" max="100" type="number" value={transactionForm.deductionPercent} onChange={(event) => setTransactionForm((item) => ({ ...item, deductionPercent: event.target.value }))}/></label>
              {transactionForm.purchaseScope === "mixed" && <label><span>Fördelningsgrund</span><input required value={transactionForm.allocationBasis} onChange={(event) => setTransactionForm((item) => ({ ...item, allocationBasis: event.target.value }))} placeholder="Ex. omsättningsandel"/></label>}
              {transactionForm.kind === "investment" && <small className="business-help warning">Inventarier kostnadsförs inte alltid direkt. Ange ett verifierat avskrivningsunderlag; automatisk avskrivningsplan ingår ännu inte.</small>}
            </>}
            <label><span>Betalstatus</span><select value={transactionForm.paymentStatus} onChange={(event) => setTransactionForm((item) => ({ ...item, paymentStatus: event.target.value as PaymentStatus }))}><option value="paid">Betald</option><option value="unpaid">Obetald</option><option value="partial">Delbetald</option></select></label>
            {transactionForm.paymentStatus !== "paid" && <label><span>Förfallodatum</span><input type="date" value={transactionForm.dueDate} onChange={(event) => setTransactionForm((item) => ({ ...item, dueDate: event.target.value }))}/></label>}
            {transactionForm.paymentStatus !== "unpaid" && <label><span>Betaldatum</span><input type="date" value={transactionForm.paidOn} onChange={(event) => setTransactionForm((item) => ({ ...item, paidOn: event.target.value }))}/></label>}
            {transactionForm.paymentStatus === "partial" && <label><span>Betalt hittills</span><input inputMode="decimal" value={transactionForm.paidAmount} onChange={(event) => setTransactionForm((item) => ({ ...item, paidAmount: event.target.value }))}/></label>}
            <button disabled={saving} type="submit"><Save size={16}/>{editingTransactionId ? "Spara ändring" : "Registrera"}</button>
            {editingTransactionId && <button className="secondary" onClick={() => { setEditingTransactionId(null); setTransactionForm(defaultTransactionForm()); }} type="button">Avbryt</button>}
          </form>
          <article className="panel business-history"><div className="business-card-title"><div><h3>Historik</h3><p>{transactions.length} affärshändelser</p></div><button onClick={() => downloadCsv(profile, transactions)} type="button"><Download size={15}/> CSV</button></div>
            <div className="business-list">{transactions.length ? transactions.map((item) => <div key={item.id}><span><b>{item.category}</b><small>{TRANSACTION_LABELS[item.kind]} · {item.occurred_on} · {item.payment_status === "paid" ? "betald" : item.payment_status === "partial" ? "delbetald" : "obetald"}</small></span><strong>{formatOre(item.gross_amount_ore)}</strong><span className="business-row-actions"><button aria-label={`Redigera ${item.category}`} onClick={() => editTransaction(item)} type="button"><Edit3 size={14}/></button><button aria-label={`Radera ${item.category}`} onClick={() => void removeWithConfirmation("affärshändelsen", () => deleteBusinessTransaction(item.id), "Affärshändelsen togs bort.")} type="button"><Trash2 size={14}/></button></span></div>) : <p className="business-empty">Ingen historik ännu.</p>}</div>
          </article>
        </div>
      )}

      {tab === "tax" && summary && (
        <div className="business-tax-grid">
          {!summary.supportedRuleYear && <div className="business-message warning"><AlertTriangle size={16}/>Automatiska skatteregler finns bara för inkomstår 2026. Registrerade belopp finns kvar, men skatteprognosen kräver verifierat manuellt underlag för valt år.</div>}
          <article className="panel"><ReceiptText size={20}/><span>Utgående moms</span><strong>{formatOre(summary.outputVatOre)}</strong><small>Momspliktig försäljning i vald period</small></article>
          <article className="panel"><ReceiptText size={20}/><span>Avdragsgill ingående moms</span><strong>{formatOre(summary.deductibleInputVatOre)}</strong><small>Baserat på faktisk moms och angiven avdragsrätt</small></article>
          <article className="panel"><Landmark size={20}/><span>Kvarstående momsreserv</span><strong>{formatOre(summary.vatRemainingOre)}</strong><small>Prognos/underlag – inte inlämnad momsdeklaration</small></article>
          <article className="panel"><Landmark size={20}/><span>Beräknad skatt</span><strong>{summary.calculatedTaxOre === null ? "Underlag saknas" : formatOre(summary.calculatedTaxOre)}</strong><small>{profile.company_form === "limited_company" ? "20,6 % bolagsskatt på positivt skattemässigt resultat" : "Kräver verifierad personlig årsprognos"}</small></article>
          {!summary.taxCalculationComplete && <div className="business-message warning"><AlertTriangle size={16}/>{profile.company_form === "sole_trader" ? "Personskatt för enskild firma visas inte som ett exakt belopp utan verifierat årsunderlag. Lägg in beräknad total årsskatt i Inställningar." : "Automatisk bolagsskatt saknar stöd för valt regelår. Lägg in verifierad skatteskuld om den ska reserveras."}</div>}
          <article className="panel business-wide-card"><h3>Viktiga avgränsningar</h3><p>F-skatt omfattar redan egenavgifter. Betalda belopp minskar reserven och räknas inte som en extra skatt. Vårdundantag och blandad verksamhet bedöms per post. Bokslutsjustering av obetalda fakturor samt full inventariehantering kräver extern bokföring.</p></article>
        </div>
      )}

      {tab === "withdrawal" && summary && (
        <div className="business-two-column">
          <article className="panel business-withdrawal"><h3>{profile.company_form === "sole_trader" ? "Eget uttag idag" : "Löneutrymme idag"}</h3><strong>{summary.withdrawalSpaceOre === null ? "Saknar avstämt saldo" : formatOre(summary.withdrawalSpaceOre)}</strong><p>Kontosaldo efter kvarvarande skatt, moms, åtaganden och driftbuffert.</p>{summary.liquidityShortfallOre ? <div className="business-message error">Brist: {formatOre(summary.liquidityShortfallOre)}</div> : null}</article>
          {profile.company_form === "sole_trader" ? <article className="panel business-info-card"><h3>Eget uttag är inte lön</h3><p>Ett uttag minskar kassan men inte verksamhetens resultat eller direkta skatteberäkning. Skatten grundas på årets skattemässiga överskott, även om pengarna ligger kvar i företaget.</p><button onClick={() => { setTransactionForm((item) => ({ ...item, kind: "owner_withdrawal", category: "Eget uttag", vatTreatment: "taxable" })); setTab("transactions"); }} type="button"><Plus size={15}/> Registrera eget uttag</button></article>
          : <form className="panel business-salary-form"><h3>Prova bruttolön</h3><label><span>Bruttolön</span><input inputMode="decimal" value={grossSalary} onChange={(event) => setGrossSalary(event.target.value)}/></label><label><span>Verifierat/syntetiskt skatteavdrag</span><input inputMode="decimal" placeholder="Krävs för nettolön" value={salaryWithholding} onChange={(event) => setSalaryWithholding(event.target.value)}/></label>{salaryScenario && <div className="business-result-list"><span>Arbetsgivaravgift <b>{formatOre(salaryScenario.employerContributionOre)}</b></span><span>Total lönekostnad <b>{formatOre(salaryScenario.totalSalaryCostOre)}</b></span><span>Omräknad bolagsskatt <b>{formatOre(salaryScenario.corporateTaxOre)}</b></span><span>Nettolön <b>{salaryScenario.netSalaryOre === null ? "Ange verifierat avdrag" : formatOre(salaryScenario.netSalaryOre)}</b></span></div>}<small>Skattetabell 32 är inte en generell procentsats. Därför beräknas inte nettolön utan ett verifierat avdrag.</small></form>}
        </div>
      )}

      {tab === "forecast" && scenarioResult && (
        <div className="business-two-column">
          <form className="business-form panel" onSubmit={(event) => event.preventDefault()}><h3>Scenario – inte bokfört utfall</h3><label><span>Namn</span><input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)}/></label><label><span>Pris per behandling/uppdrag</span><input inputMode="decimal" value={String(scenario.servicePriceOre / 100)} onChange={(event) => setScenario((item) => ({ ...item, servicePriceOre: parseMoneyToOre(event.target.value) ?? 0 }))}/></label><label><span>Kunder per vecka</span><input min="0" type="number" value={scenario.clientsPerWeek} onChange={(event) => setScenario((item) => ({ ...item, clientsPerWeek: Number(event.target.value) }))}/></label><label><span>Arbetsveckor</span><input min="1" max="52" type="number" value={scenario.workingWeeks} onChange={(event) => setScenario((item) => ({ ...item, workingWeeks: Number(event.target.value) }))}/></label><label><span>Andel momsfri vård (%)</span><input min="0" max="100" type="number" value={scenario.exemptSharePercent} onChange={(event) => setScenario((item) => ({ ...item, exemptSharePercent: Number(event.target.value) }))}/></label><label><span>Övriga årliga fasta kostnader</span><input inputMode="decimal" value={String(scenario.annualFixedCostsOre / 100)} onChange={(event) => setScenario((item) => ({ ...item, annualFixedCostsOre: parseMoneyToOre(event.target.value) ?? 0 }))}/></label><label><span>Rörlig kostnad per kund</span><input inputMode="decimal" value={String(scenario.variableCostPerClientOre / 100)} onChange={(event) => setScenario((item) => ({ ...item, variableCostPerClientOre: parseMoneyToOre(event.target.value) ?? 0 }))}/></label><label><span>Önskat privat per månad</span><input inputMode="decimal" value={String(scenario.desiredPrivateMonthlyOre / 100)} onChange={(event) => setScenario((item) => ({ ...item, desiredPrivateMonthlyOre: parseMoneyToOre(event.target.value) ?? 0 }))}/></label><button disabled={saving} onClick={() => void saveScenarioNow()} type="button"><Save size={15}/> Spara scenario</button></form>
          <article className="panel business-forecast-result"><h3>Beräknad helårsprognos</h3><div className="business-result-list"><span>Uppdrag <b>{scenarioResult.annualClients}</b></span><span>Omsättning exkl. moms <b>{formatOre(scenarioResult.annualRevenueOre)}</b></span><span>Kostnader <b>{formatOre(scenarioResult.annualCostsOre)}</b></span>{scenarioResult.recurringAnnualCostsOre > 0 && <span>Varav sparade återkommande kostnader <b>{formatOre(scenarioResult.recurringAnnualCostsOre)}</b></span>}<span>Resultat före skatt <b>{formatOre(scenarioResult.resultBeforeTaxOre)}</b></span><span>Resultat efter känd skatt <b>{formatOre(scenarioResult.resultAfterKnownTaxOre)}</b></span><span>Behov för privat mål <b>{scenarioResult.requiredClients} uppdrag ({scenarioResult.requiredClientsPerWeek?.toFixed(1) ?? "–"}/vecka)</b></span></div><small>Enskild firmas personskatt är inte avdragen här utan verifierat personligt årsunderlag. Prognosen skriver aldrig transaktioner.</small><div className="business-saved-scenarios">{workspace.scenarios.filter((item) => item.profile_id === profile.id).map((item) => <span key={item.id}><button onClick={() => { setScenario(item.assumptions); setScenarioName(item.name); }} type="button">{item.name}</button><button aria-label={`Ta bort ${item.name}`} onClick={() => void removeWithConfirmation(`scenariot ${item.name}`, () => deleteBusinessScenario(item.id), "Scenariot togs bort.")} type="button"><Trash2 size={13}/></button></span>)}</div></article>
        </div>
      )}

      {tab === "settings" && (
        <div className="business-settings-grid">
          <form className="business-form panel" onSubmit={saveSettings}><h3>Företags- och skatteunderlag</h3><label><span>Företagsnamn</span><input name="name" required defaultValue={profile.name}/></label><label><span>Avstämt kontosaldo</span><input name="bankBalance" inputMode="decimal" defaultValue={profile.bank_balance_ore === null ? "" : profile.bank_balance_ore / 100}/></label><label><span>Avstämningsdatum</span><input name="balanceDate" type="date" defaultValue={profile.balance_date ?? ""}/></label><label><span>Driftbuffert</span><input name="buffer" inputMode="decimal" defaultValue={profile.buffer_ore / 100}/></label><label><span>Redan betald skatt</span><input name="paidTax" inputMode="decimal" defaultValue={profile.paid_tax_ore / 100}/></label>{profile.company_form === "sole_trader" && <label><span>Verifierad total personlig årsskatt</span><input name="annualTax" inputMode="decimal" defaultValue={profile.manual_annual_income_tax_ore === null ? "" : profile.manual_annual_income_tax_ore / 100}/></label>}<label><span>Födelseår</span><input name="birthYear" inputMode="numeric" defaultValue={profile.birth_year ?? ""}/></label><label><span>Kommun</span><input name="municipality" defaultValue={profile.municipality ?? ""}/></label><label><span>Redovisningsmetod</span><select name="accountingMethod" defaultValue={profile.accounting_method}><option value="cash">Kontantmetoden</option><option value="invoice">Fakturametoden</option></select></label><label><span>Momsperiod</span><select name="vatPeriod" defaultValue={profile.vat_period}><option value="monthly">Månad</option><option value="quarterly">Kvartal</option><option value="yearly">År</option></select></label><label className="business-check"><input name="healthcare" type="checkbox" defaultChecked={profile.licensed_healthcare_profile}/><span>Profil för legitimerad vård</span></label><button disabled={saving} type="submit"><Save size={15}/> Spara inställningar</button></form>
          <div className="business-settings-stack">
            <form className="panel business-mini-form" onSubmit={(event) => { event.preventDefault(); void runSave(async () => { await saveBusinessServiceTemplate({ profile_id: profile.id, name: serviceName, category: serviceName, default_amount_ore: fieldOre(serviceAmount), vat_treatment: "taxable", vat_rate_basis_points: 2500, amount_entry: "inclusive" }); setServiceName(""); setServiceAmount(""); }, "Tjänstemallen sparades."); }}>
              <h3>Tjänstemallar</h3>
              <input required placeholder="Namn" value={serviceName} onChange={(event) => setServiceName(event.target.value)}/>
              <input required inputMode="decimal" placeholder="Standardpris" value={serviceAmount} onChange={(event) => setServiceAmount(event.target.value)}/>
              <button type="submit"><Plus size={14}/> Lägg till</button>
              <div className="business-compact-list">{workspace.serviceTemplates.filter((item) => item.profile_id === profile.id).map((item) => <span key={item.id}>{item.name}<button aria-label={`Radera tjänstemallen ${item.name}`} onClick={() => void removeWithConfirmation(`tjänstemallen ${item.name}`, () => deleteBusinessServiceTemplate(item.id), "Tjänstemallen togs bort.")} type="button"><Trash2 size={13}/></button></span>)}</div>
            </form>
            <form className="panel business-mini-form business-recurring-form" onSubmit={(event) => { event.preventDefault(); void runSave(async () => { await saveBusinessRecurringCost({ profile_id: profile.id, name: recurringName.trim(), category: "Återkommande", amount_ore: fieldOre(recurringAmount), frequency_months: Number(recurringFrequency), next_due_date: recurringNextDue, active: true }); setRecurringName(""); setRecurringAmount(""); }, "Den återkommande kostnaden sparades."); }}>
              <h3>Återkommande kostnader</h3>
              <input aria-label="Namn på återkommande kostnad" required placeholder="Namn" value={recurringName} onChange={(event) => setRecurringName(event.target.value)}/>
              <input aria-label="Belopp för återkommande kostnad" required inputMode="decimal" placeholder="Belopp" value={recurringAmount} onChange={(event) => setRecurringAmount(event.target.value)}/>
              <select aria-label="Hur ofta kostnaden återkommer" value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value)}><option value="1">Varje månad</option><option value="3">Varje kvartal</option><option value="6">Varje halvår</option><option value="12">Varje år</option></select>
              <input aria-label="Nästa förfallodatum" required type="date" value={recurringNextDue} onChange={(event) => setRecurringNextDue(event.target.value)}/>
              <button type="submit"><Plus size={14}/> Lägg till</button>
              <div className="business-compact-list">{recurringCosts.map((item) => <span key={item.id}><span>{item.name} · {formatOre(item.amount_ore)} · nästa {item.next_due_date}</span><span className="business-row-actions"><button aria-label={`Registrera betalning för ${item.name}`} onClick={() => registerRecurringCost(item)} type="button"><ReceiptText size={13}/></button><button aria-label={`Radera kostnadsmallen ${item.name}`} onClick={() => void removeWithConfirmation(`kostnadsmallen ${item.name}`, () => deleteBusinessRecurringCost(item.id), "Kostnadsmallen togs bort.")} type="button"><Trash2 size={13}/></button></span></span>)}</div>
            </form>
          </div>
        </div>
      )}

      <footer className="business-disclaimer">Företag ger planeringsunderlag för 2026 och ersätter inte fullständig bokföring, skatterådgivning, deklaration eller patientjournal. Spara aldrig patientnamn, personnummer, diagnos eller journaltext här.</footer>
    </div>
  );
}
