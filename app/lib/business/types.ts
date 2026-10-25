export type CompanyForm = "sole_trader" | "limited_company";
export type AccountingMethod = "cash" | "invoice";
export type VatPeriod = "monthly" | "quarterly" | "yearly";
export type VatTreatment = "healthcare_exempt" | "taxable";
export type VatRate = 0 | 600 | 1200 | 2500;
export type AmountEntryMode = "inclusive" | "exclusive";
export type PaymentStatus = "paid" | "unpaid" | "partial";
export type PurchaseVatScope = "taxable" | "exempt" | "mixed";
export type BusinessTransactionKind =
  | "sale"
  | "expense"
  | "investment"
  | "interest"
  | "loan_received"
  | "loan_repayment"
  | "owner_deposit"
  | "owner_withdrawal"
  | "tax_payment"
  | "salary_payment";

export type BusinessProfile = {
  id: string;
  user_id: string;
  name: string;
  company_form: CompanyForm;
  business_start: string | null;
  fiscal_year_start_month: number;
  vat_registered: boolean;
  vat_period: VatPeriod;
  accounting_method: AccountingMethod;
  licensed_healthcare_profile: boolean;
  bank_balance_ore: number | null;
  balance_date: string | null;
  opening_receivables_ore: number;
  opening_payables_ore: number;
  prior_year_revenue_ore: number;
  prior_year_costs_ore: number;
  paid_tax_ore: number;
  birth_year: number | null;
  municipality: string | null;
  tax_table: number | null;
  tax_column: number | null;
  other_annual_income_ore: number;
  withheld_tax_ore: number;
  desired_private_monthly_ore: number;
  buffer_ore: number;
  buffer_months: number;
  pension_ore: number;
  weeks_off: number;
  manual_annual_income_tax_ore: number | null;
  manual_verified_tax_debt_ore: number | null;
  manual_tax_adjustment_ore: number;
  created_at: string;
  updated_at: string;
};

export type BusinessTransaction = {
  id: string;
  user_id: string;
  profile_id: string;
  occurred_on: string;
  kind: BusinessTransactionKind;
  category: string;
  description: string;
  vat_treatment: VatTreatment | null;
  vat_rate_basis_points: VatRate;
  amount_entry: AmountEntryMode;
  entered_amount_ore: number;
  net_amount_ore: number;
  vat_amount_ore: number;
  gross_amount_ore: number;
  deductible_vat_ore: number;
  income_tax_deductible_ore: number;
  payment_status: PaymentStatus;
  paid_amount_ore: number;
  due_date: string | null;
  paid_on: string | null;
  purchase_vat_scope: PurchaseVatScope | null;
  vat_deduction_percent: number;
  allocation_basis: string | null;
  recurring_cost_id: string | null;
  linked_private_purchase_id: number | null;
  rule_year: number;
  created_at: string;
  updated_at: string;
};

export type BusinessServiceTemplate = {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  category: string;
  default_amount_ore: number;
  vat_treatment: VatTreatment;
  vat_rate_basis_points: VatRate;
  amount_entry: AmountEntryMode;
  created_at: string;
  updated_at: string;
};

export type BusinessRecurringCost = {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  category: string;
  amount_ore: number;
  frequency_months: number;
  next_due_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessScenario = {
  id: string;
  user_id: string;
  profile_id: string;
  name: string;
  assumptions: BusinessScenarioAssumptions;
  created_at: string;
  updated_at: string;
};

export type BusinessScenarioAssumptions = {
  servicePriceOre: number;
  priceIncludesVat: boolean;
  vatRateBasisPoints: VatRate;
  exemptSharePercent: number;
  clientsPerWeek: number;
  workingWeeks: number;
  annualFixedCostsOre: number;
  variableCostPerClientOre: number;
  desiredPrivateMonthlyOre: number;
};

export type BusinessWorkspace = {
  profiles: BusinessProfile[];
  transactions: BusinessTransaction[];
  serviceTemplates: BusinessServiceTemplate[];
  recurringCosts: BusinessRecurringCost[];
  scenarios: BusinessScenario[];
};

export type BusinessProfileInput = Omit<
  BusinessProfile,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type BusinessTransactionInput = Omit<
  BusinessTransaction,
  "id" | "user_id" | "created_at" | "updated_at"
>;

