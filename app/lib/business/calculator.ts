import { multiplyBasisPoints } from "./money.ts";
import { BUSINESS_RULES_2026 } from "./rules/2026.ts";
import type {
  AmountEntryMode,
  BusinessProfile,
  BusinessScenarioAssumptions,
  BusinessTransaction,
  CompanyForm,
  VatRate,
  VatTreatment,
} from "./types.ts";

export type VatAmounts = { netOre: number; vatOre: number; grossOre: number };

export function calculateSaleAmounts(input: {
  enteredAmountOre: number;
  amountEntry: AmountEntryMode;
  vatTreatment: VatTreatment;
  vatRateBasisPoints: VatRate;
}): VatAmounts {
  if (input.enteredAmountOre < 0) throw new Error("Beloppet får inte vara negativt.");
  if (input.vatTreatment === "healthcare_exempt") {
    return { netOre: input.enteredAmountOre, vatOre: 0, grossOre: input.enteredAmountOre };
  }

  const rate = input.vatRateBasisPoints;
  if (input.amountEntry === "exclusive") {
    const vatOre = multiplyBasisPoints(input.enteredAmountOre, rate);
    return { netOre: input.enteredAmountOre, vatOre, grossOre: input.enteredAmountOre + vatOre };
  }

  const netOre = Math.round((input.enteredAmountOre * 10_000) / (10_000 + rate));
  return { netOre, vatOre: input.enteredAmountOre - netOre, grossOre: input.enteredAmountOre };
}

export function calculateExpenseAmounts(input: {
  grossAmountOre: number;
  actualVatOre: number;
  vatDeductionPercent: number;
}): { deductibleVatOre: number; costBasisOre: number; grossOre: number } {
  if (input.grossAmountOre < 0 || input.actualVatOre < 0 || input.actualVatOre > input.grossAmountOre) {
    throw new Error("Kontrollera kostnad och faktisk moms.");
  }
  if (input.vatDeductionPercent < 0 || input.vatDeductionPercent > 100) {
    throw new Error("Avdragsrätten måste vara 0–100 procent.");
  }
  const deductibleVatOre = Math.round((input.actualVatOre * input.vatDeductionPercent) / 100);
  return {
    deductibleVatOre,
    costBasisOre: input.grossAmountOre - deductibleVatOre,
    grossOre: input.grossAmountOre,
  };
}

export function calculateEmployerContribution(input: {
  grossSalaryOre: number;
  birthYear: number | null;
  paymentDate: string;
  grossSalaryEarlierSameMonthOre?: number;
}): number {
  const { grossSalaryOre, birthYear, paymentDate } = input;
  if (grossSalaryOre <= 0) return 0;
  const rules = BUSINESS_RULES_2026;
  const isYouth = birthYear !== null && birthYear >= rules.youthBirthYearFrom && birthYear <= rules.youthBirthYearTo;
  const hasReduction = isYouth && paymentDate >= rules.youthReductionStartsOn && paymentDate <= rules.youthReductionEndsOn;
  if (!hasReduction) return multiplyBasisPoints(grossSalaryOre, rules.standardEmployerContributionBasisPoints);

  const usedLimit = Math.min(input.grossSalaryEarlierSameMonthOre ?? 0, rules.youthReducedMonthlyLimitOre);
  const reducedPart = Math.min(grossSalaryOre, Math.max(rules.youthReducedMonthlyLimitOre - usedLimit, 0));
  const normalPart = grossSalaryOre - reducedPart;
  return multiplyBasisPoints(reducedPart, rules.youthEmployerContributionBasisPoints)
    + multiplyBasisPoints(normalPart, rules.standardEmployerContributionBasisPoints);
}

export function calculateSalaryScenario(input: {
  grossSalaryOre: number;
  syntheticOrVerifiedWithholdingOre: number | null;
  birthYear: number | null;
  paymentDate: string;
  resultBeforeSalaryOre: number;
  corporateTaxPaidOre?: number;
}) {
  const employerContributionOre = calculateEmployerContribution(input);
  const totalSalaryCostOre = input.grossSalaryOre + employerContributionOre;
  const resultAfterSalaryOre = input.resultBeforeSalaryOre - totalSalaryCostOre;
  const corporateTaxOre = multiplyBasisPoints(
    Math.max(resultAfterSalaryOre, 0),
    BUSINESS_RULES_2026.corporateTaxBasisPoints,
  );
  return {
    employerContributionOre,
    totalSalaryCostOre,
    resultAfterSalaryOre,
    corporateTaxOre,
    corporateTaxRemainingOre: Math.max(corporateTaxOre - (input.corporateTaxPaidOre ?? 0), 0),
    netSalaryOre: input.syntheticOrVerifiedWithholdingOre === null
      ? null
      : input.grossSalaryOre - input.syntheticOrVerifiedWithholdingOre,
  };
}

function transactionDate(transaction: BusinessTransaction): string {
  return transaction.payment_status === "paid" && transaction.paid_on
    ? transaction.paid_on
    : transaction.occurred_on;
}

function isInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function isExpenseKind(kind: BusinessTransaction["kind"]): boolean {
  return kind === "expense" || kind === "investment" || kind === "interest" || kind === "salary_payment";
}

export function calculateBusinessSummary(input: {
  profile: BusinessProfile;
  transactions: BusinessTransaction[];
  from: string;
  to: string;
}) {
  const { profile, from, to } = input;
  const period = input.transactions.filter((item) => isInRange(item.occurred_on, from, to));
  const paidInPeriod = input.transactions.filter((item) =>
    item.payment_status !== "unpaid" && item.paid_amount_ore > 0 && isInRange(transactionDate(item), from, to));
  const recognized = profile.accounting_method === "invoice" ? period : paidInPeriod;
  const recognizedAmount = (item: BusinessTransaction, amountOre: number) => {
    if (profile.accounting_method === "invoice" || item.payment_status === "paid" || item.gross_amount_ore === 0) return amountOre;
    return Math.round((amountOre * item.paid_amount_ore) / item.gross_amount_ore);
  };

  const revenueOre = recognized.filter((item) => item.kind === "sale").reduce((sum, item) => sum + recognizedAmount(item, item.net_amount_ore), 0);
  const costsOre = recognized.filter((item) => isExpenseKind(item.kind)).reduce((sum, item) => sum + recognizedAmount(item, item.income_tax_deductible_ore), 0);
  const resultBeforeTaxOre = revenueOre - costsOre + profile.manual_tax_adjustment_ore;
  const outputVatOre = recognized.filter((item) => item.kind === "sale").reduce((sum, item) => sum + recognizedAmount(item, item.vat_amount_ore), 0);
  const deductibleInputVatOre = recognized.filter((item) => isExpenseKind(item.kind)).reduce((sum, item) => sum + recognizedAmount(item, item.deductible_vat_ore), 0);
  const taxPaymentsOre = paidInPeriod.filter((item) => item.kind === "tax_payment").reduce((sum, item) => sum + item.gross_amount_ore, 0);
  const automaticTaxOre = profile.company_form === "limited_company"
    && from.startsWith(`${BUSINESS_RULES_2026.year}-`)
    ? multiplyBasisPoints(Math.max(resultBeforeTaxOre, 0), BUSINESS_RULES_2026.corporateTaxBasisPoints)
    : null;
  const relevantAnnualTaxOre = profile.manual_verified_tax_debt_ore
    ?? (profile.company_form === "sole_trader" ? profile.manual_annual_income_tax_ore : automaticTaxOre);
  const taxRemainingOre = relevantAnnualTaxOre === null
    ? null
    : Math.max(relevantAnnualTaxOre - profile.paid_tax_ore - taxPaymentsOre, 0);
  const vatRemainingOre = Math.max(outputVatOre - deductibleInputVatOre, 0);

  const unpaidInvoicesOre = input.transactions
    .filter((item) => item.kind === "sale" && item.payment_status !== "paid")
    .reduce((sum, item) => sum + Math.max(item.gross_amount_ore - item.paid_amount_ore, 0), 0);
  const unpaidCommitmentsOre = input.transactions
    .filter((item) => isExpenseKind(item.kind) && item.payment_status !== "paid")
    .reduce((sum, item) => sum + Math.max(item.gross_amount_ore - item.paid_amount_ore, 0), 0)
    + profile.opening_payables_ore;

  const cashMovementOre = paidInPeriod.reduce((sum, item) => {
    const amount = item.paid_amount_ore || item.gross_amount_ore;
    if (item.kind === "sale" || item.kind === "loan_received" || item.kind === "owner_deposit") return sum + amount;
    return sum - amount;
  }, 0);
  const availableCashOre = profile.bank_balance_ore === null ? null : profile.bank_balance_ore;
  const reservationsOre = (taxRemainingOre ?? 0) + vatRemainingOre + unpaidCommitmentsOre + profile.buffer_ore;
  const liquidityAfterReservationsOre = availableCashOre === null ? null : availableCashOre - reservationsOre;
  const withdrawalSpaceOre = liquidityAfterReservationsOre === null ? null : Math.max(liquidityAfterReservationsOre, 0);

  return {
    revenueOre,
    costsOre,
    resultBeforeTaxOre,
    outputVatOre,
    deductibleInputVatOre,
    vatRemainingOre,
    calculatedTaxOre: relevantAnnualTaxOre,
    taxPaymentsOre: profile.paid_tax_ore + taxPaymentsOre,
    taxRemainingOre,
    unpaidInvoicesOre: unpaidInvoicesOre + profile.opening_receivables_ore,
    unpaidCommitmentsOre,
    availableCashOre,
    cashMovementOre,
    reservationsOre,
    liquidityAfterReservationsOre,
    withdrawalSpaceOre,
    liquidityShortfallOre: liquidityAfterReservationsOre === null ? null : Math.max(-liquidityAfterReservationsOre, 0),
    taxCalculationComplete: relevantAnnualTaxOre !== null,
    supportedRuleYear: from.startsWith(`${BUSINESS_RULES_2026.year}-`),
  };
}

export function calculateScenario(
  assumptions: BusinessScenarioAssumptions,
  companyForm: CompanyForm,
) {
  const taxableShare = (100 - assumptions.exemptSharePercent) / 100;
  const annualClients = Math.max(Math.round(assumptions.clientsPerWeek * assumptions.workingWeeks), 0);
  const taxableClients = Math.round(annualClients * taxableShare);
  const exemptClients = annualClients - taxableClients;
  const taxablePrice = calculateSaleAmounts({
    enteredAmountOre: assumptions.servicePriceOre,
    amountEntry: assumptions.priceIncludesVat ? "inclusive" : "exclusive",
    vatTreatment: "taxable",
    vatRateBasisPoints: assumptions.vatRateBasisPoints,
  });
  const exemptPrice = calculateSaleAmounts({
    enteredAmountOre: assumptions.servicePriceOre,
    amountEntry: assumptions.priceIncludesVat ? "inclusive" : "exclusive",
    vatTreatment: "healthcare_exempt",
    vatRateBasisPoints: 0,
  });
  const annualRevenueOre = taxableClients * taxablePrice.netOre + exemptClients * exemptPrice.netOre;
  const annualVatOre = taxableClients * taxablePrice.vatOre;
  const annualVariableCostsOre = annualClients * assumptions.variableCostPerClientOre;
  const resultBeforeTaxOre = annualRevenueOre - assumptions.annualFixedCostsOre - annualVariableCostsOre;
  const corporateTaxOre = companyForm === "limited_company"
    ? multiplyBasisPoints(Math.max(resultBeforeTaxOre, 0), BUSINESS_RULES_2026.corporateTaxBasisPoints)
    : null;
  const privateTargetAnnualOre = assumptions.desiredPrivateMonthlyOre * 12;
  const priceNetWeightedOre = Math.round(
    taxablePrice.netOre * taxableShare + exemptPrice.netOre * (1 - taxableShare),
  );
  const contributionPerClientOre = Math.max(priceNetWeightedOre - assumptions.variableCostPerClientOre, 1);
  const requiredResultOre = companyForm === "limited_company"
    ? Math.ceil(privateTargetAnnualOre / (1 - BUSINESS_RULES_2026.corporateTaxBasisPoints / 10_000))
    : privateTargetAnnualOre;
  const requiredClients = Math.ceil((requiredResultOre + assumptions.annualFixedCostsOre) / contributionPerClientOre);
  return {
    annualClients,
    annualRevenueOre,
    annualVatOre,
    annualCostsOre: assumptions.annualFixedCostsOre + annualVariableCostsOre,
    resultBeforeTaxOre,
    corporateTaxOre,
    resultAfterKnownTaxOre: resultBeforeTaxOre - (corporateTaxOre ?? 0),
    requiredClients,
    requiredClientsPerWeek: assumptions.workingWeeks > 0 ? requiredClients / assumptions.workingWeeks : null,
  };
}
