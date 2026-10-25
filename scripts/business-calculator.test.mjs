import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBusinessSummary,
  calculateEmployerContribution,
  calculateExpenseAmounts,
  calculateSalaryScenario,
  calculateSaleAmounts,
} from "../app/lib/business/calculator.ts";

const profile = (overrides = {}) => ({
  id: "p1", user_id: "u1", name: "Test", company_form: "sole_trader", business_start: "2026-01-01",
  fiscal_year_start_month: 1, vat_registered: true, vat_period: "quarterly", accounting_method: "cash",
  licensed_healthcare_profile: false, bank_balance_ore: 2_000_000, balance_date: "2026-06-30",
  opening_receivables_ore: 0, opening_payables_ore: 0, prior_year_revenue_ore: 0, prior_year_costs_ore: 0,
  paid_tax_ore: 0, birth_year: 1990, municipality: null, tax_table: null, tax_column: null,
  other_annual_income_ore: 0, withheld_tax_ore: 0, desired_private_monthly_ore: 0, buffer_ore: 0,
  buffer_months: 0, pension_ore: 0, weeks_off: 0, manual_annual_income_tax_ore: 0,
  manual_verified_tax_debt_ore: null, manual_tax_adjustment_ore: 0,
  created_at: "2026-01-01", updated_at: "2026-01-01", ...overrides,
});

const transaction = (overrides = {}) => ({
  id: crypto.randomUUID(), user_id: "u1", profile_id: "p1", occurred_on: "2026-06-10", kind: "sale",
  category: "Behandling", description: "", vat_treatment: "taxable", vat_rate_basis_points: 2500,
  amount_entry: "inclusive", entered_amount_ore: 125000, net_amount_ore: 100000, vat_amount_ore: 25000,
  gross_amount_ore: 125000, deductible_vat_ore: 0, income_tax_deductible_ore: 0,
  payment_status: "paid", paid_amount_ore: 125000, due_date: null, paid_on: "2026-06-10",
  purchase_vat_scope: null, vat_deduction_percent: 0, allocation_basis: null, recurring_cost_id: null,
  linked_private_purchase_id: null, rule_year: 2026, created_at: "2026-06-10", updated_at: "2026-06-10",
  ...overrides,
});

test("25 percent VAT works for inclusive and exclusive sale amounts", () => {
  assert.deepEqual(calculateSaleAmounts({ enteredAmountOre: 125000, amountEntry: "inclusive", vatTreatment: "taxable", vatRateBasisPoints: 2500 }), { netOre: 100000, vatOre: 25000, grossOre: 125000 });
  assert.deepEqual(calculateSaleAmounts({ enteredAmountOre: 100000, amountEntry: "exclusive", vatTreatment: "taxable", vatRateBasisPoints: 2500 }), { netOre: 100000, vatOre: 25000, grossOre: 125000 });
});

test("healthcare exemption is distinct and has no output VAT", () => {
  assert.deepEqual(calculateSaleAmounts({ enteredAmountOre: 100000, amountEntry: "inclusive", vatTreatment: "healthcare_exempt", vatRateBasisPoints: 0 }), { netOre: 100000, vatOre: 0, grossOre: 100000 });
});

test("mixed purchase VAT deduction handles 0, 40 and 100 percent", () => {
  assert.deepEqual(calculateExpenseAmounts({ grossAmountOre: 125000, actualVatOre: 25000, vatDeductionPercent: 40 }), { deductibleVatOre: 10000, costBasisOre: 115000, grossOre: 125000 });
  assert.equal(calculateExpenseAmounts({ grossAmountOre: 125000, actualVatOre: 25000, vatDeductionPercent: 0 }).costBasisOre, 125000);
  assert.equal(calculateExpenseAmounts({ grossAmountOre: 125000, actualVatOre: 25000, vatDeductionPercent: 100 }).costBasisOre, 100000);
});

test("owner withdrawal changes cash movement but not revenue or result", () => {
  const summary = calculateBusinessSummary({ profile: profile(), transactions: [transaction({ kind: "owner_withdrawal", gross_amount_ore: 1000000, paid_amount_ore: 1000000, net_amount_ore: 1000000, vat_amount_ore: 0 })], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(summary.resultBeforeTaxOre, 0);
  assert.equal(summary.cashMovementOre, -1000000);
});

test("tax payments reduce reserve without being subtracted from reconciled bank balance again", () => {
  const summary = calculateBusinessSummary({ profile: profile({ bank_balance_ore: 20_000_000, manual_annual_income_tax_ore: 9_000_000, paid_tax_ore: 3_000_000 }), transactions: [], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(summary.taxRemainingOre, 6_000_000);
  assert.equal(summary.availableCashOre, 20_000_000);
});

test("salary scenario separates withholding from company cost", () => {
  const result = calculateSalaryScenario({ grossSalaryOre: 3_000_000, syntheticOrVerifiedWithholdingOre: 600000, birthYear: 1990, paymentDate: "2026-02-25", resultBeforeSalaryOre: 10_000_000, corporateTaxPaidOre: 800000 });
  assert.equal(result.employerContributionOre, 942600);
  assert.equal(result.totalSalaryCostOre, 3942600);
  assert.equal(result.netSalaryOre, 2400000);
  assert.equal(result.resultAfterSalaryOre, 6057400);
  assert.equal(result.corporateTaxOre, 1247824);
  assert.equal(result.corporateTaxRemainingOre, 447824);
});

test("2026 youth reduction uses one shared monthly limit", () => {
  assert.equal(calculateEmployerContribution({ grossSalaryOre: 3000000, birthYear: 2004, paymentDate: "2026-03-25" }), 942600);
  assert.equal(calculateEmployerContribution({ grossSalaryOre: 3000000, birthYear: 2004, paymentDate: "2026-04-25" }), 677350);
  const first = calculateEmployerContribution({ grossSalaryOre: 2000000, birthYear: 2004, paymentDate: "2026-04-10" });
  const second = calculateEmployerContribution({ grossSalaryOre: 1000000, grossSalaryEarlierSameMonthOre: 2000000, birthYear: 2004, paymentDate: "2026-04-25" });
  assert.equal(first + second, 677350);
});

test("unpaid invoice does not increase cash movement and payment does not duplicate revenue", () => {
  const unpaid = transaction({ payment_status: "unpaid", paid_amount_ore: 0, paid_on: null });
  const unpaidSummary = calculateBusinessSummary({ profile: profile({ accounting_method: "invoice" }), transactions: [unpaid], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(unpaidSummary.revenueOre, 100000);
  assert.equal(unpaidSummary.cashMovementOre, 0);
  const paidSummary = calculateBusinessSummary({ profile: profile({ accounting_method: "invoice" }), transactions: [{ ...unpaid, payment_status: "paid", paid_amount_ore: 125000, paid_on: "2026-06-20" }], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(paidSummary.revenueOre, 100000);
  assert.equal(paidSummary.cashMovementOre, 125000);
});

test("liquidity shortfall stays visible", () => {
  const summary = calculateBusinessSummary({ profile: profile({ bank_balance_ore: 2_000_000, opening_payables_ore: 1_500_000, buffer_ore: 1_000_000 }), transactions: [], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(summary.liquidityShortfallOre, 500000);
  assert.equal(summary.withdrawalSpaceOre, 0);
});

test("negative result creates no automatic corporate tax cash asset", () => {
  const summary = calculateBusinessSummary({ profile: profile({ company_form: "limited_company", manual_annual_income_tax_ore: null }), transactions: [transaction({ kind: "expense", net_amount_ore: 100000, gross_amount_ore: 100000, paid_amount_ore: 100000, vat_amount_ore: 0, income_tax_deductible_ore: 100000 })], from: "2026-01-01", to: "2026-12-31" });
  assert.equal(summary.resultBeforeTaxOre, -100000);
  assert.equal(summary.calculatedTaxOre, 0);
});

test("an unsupported rule year never presents automatic corporate tax as complete", () => {
  const summary = calculateBusinessSummary({ profile: profile({ company_form: "limited_company", manual_annual_income_tax_ore: null }), transactions: [], from: "2027-01-01", to: "2027-12-31" });
  assert.equal(summary.supportedRuleYear, false);
  assert.equal(summary.calculatedTaxOre, null);
  assert.equal(summary.taxCalculationComplete, false);
});
