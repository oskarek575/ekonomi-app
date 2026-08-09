"use client";

import { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";

type LoanForm = {
  name: string;
  remainingAmount: string;
  monthlyPayment: string;
  interestRate: string;
  paymentDay: string;
};

export type LoanSectionRow = {
  id: string;
  name: string;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  paymentDay: number;
  monthsLeft: number;
  monthlyInterest: number;
  amortization: number;
  progressPct: number;
};

type LoansSectionProps = {
  loansCount: number;
  totalDebt: number;
  totalMonthlyPayment: number;
  totalMonthlyInterest: number;
  debtToIncomePct: number;
  fastestLoan: LoanSectionRow | null;
  loanRows: LoanSectionRow[];
  loanForm: LoanForm;
  editingLoanId: string | null;
  saving: boolean;
  onLoanFormChange: Dispatch<SetStateAction<LoanForm>>;
  onSaveLoan: (event: FormEvent<HTMLFormElement>) => void;
  onResetLoanForm: () => void;
  onEditLoan: (loan: LoanSectionRow) => void;
  onRemoveLoan: (id: string) => void;
  formatCurrency: (value: number) => string;
  formatLoanTime: (months: number) => string;
  CardTitle: ({ children }: { children: ReactNode }) => ReactNode;
  EmptyState: ({ text }: { text: string }) => ReactNode;
};

export default function LoansSection({
  loansCount,
  totalDebt,
  totalMonthlyPayment,
  totalMonthlyInterest,
  debtToIncomePct,
  fastestLoan,
  loanRows,
  loanForm,
  editingLoanId,
  saving,
  onLoanFormChange,
  onSaveLoan,
  onResetLoanForm,
  onEditLoan,
  onRemoveLoan,
  formatCurrency,
  formatLoanTime,
  CardTitle,
  EmptyState,
}: LoansSectionProps) {
  return (
    <>
      <section className="loan-hero panel">
        <div>
          <span>Total skuld</span>
          <h2>{formatCurrency(totalDebt)}</h2>
          <p>{loansCount ? `${loansCount} lån · ${formatCurrency(totalMonthlyPayment)} per månad` : "Lägg in första lånet för att få kontroll."}</p>
          <small>Månadsbetalningen skapas automatiskt som fast utgift, så fria pengar reserveras utan dubbeljobb.</small>
        </div>
        <div className="loan-payoff-card">
          <span>Månadsbelastning</span>
          <strong>{debtToIncomePct}%</strong>
          <small>av registrerad inkomst</small>
        </div>
      </section>

      <section className="loan-metric-grid">
        <div><span>Total skuld</span><b>{formatCurrency(totalDebt)}</b><small>Kvar att betala</small></div>
        <div><span>Betalas per månad</span><b>{formatCurrency(totalMonthlyPayment)}</b><small>Alla lån tillsammans</small></div>
        <div><span>Ränta / månad</span><b>{formatCurrency(totalMonthlyInterest)}</b><small>Ungefärlig räntekostnad</small></div>
        <div><span>Närmast klart</span><b>{fastestLoan?.name ?? "Inget lån"}</b><small>{fastestLoan ? formatLoanTime(fastestLoan.monthsLeft) : "Lägg till lån"}</small></div>
      </section>

      <section className="loan-layout">
        <article className="loan-panel">
          <CardTitle>Dina lån</CardTitle>
          <div className="loan-list">
            {loanRows.length ? loanRows.map((loan) => (
              <div className="loan-row" key={loan.id}>
                <span className="loan-logo"><CreditCard size={18}/></span>
                <div>
                  <b>{loan.name}</b>
                  <small>{formatCurrency(loan.remainingAmount)} kvar · {loan.interestRate.toString().replace(".", ",")}% ränta · dras dag {loan.paymentDay}</small>
                  <div className="loan-progress"><i style={{ width: `${loan.progressPct}%` }}/></div>
                </div>
                <span><b>{formatCurrency(loan.monthlyPayment)}/mån</b><small>{formatLoanTime(loan.monthsLeft)}</small></span>
                <strong>{formatCurrency(loan.amortization)}<small>amortering/mån</small></strong>
                <span className="row-actions">
                  <button onClick={() => onEditLoan(loan)} type="button">Redigera</button>
                  <button onClick={() => onRemoveLoan(loan.id)} type="button"><Trash2 size={14}/></button>
                </span>
              </div>
            )) : <EmptyState text="Lägg till första lånet för att se skuld, månadsbetalning och ungefärlig tid kvar." />}
          </div>
        </article>

        <article className="loan-panel">
          <CardTitle>Så läser du lån</CardTitle>
          <div className="loan-help-list">
            <div><b>Skuld</b><small>Det belopp som är kvar att betala tillbaka.</small></div>
            <div><b>Månadsbetalning</b><small>Det du faktiskt betalar varje månad.</small></div>
            <div><b>Tid kvar</b><small>En uppskattning baserat på dagens skuld, ränta och betalning.</small></div>
            <div><b>Fast utgift</b><small>Appen skapar automatiskt en fast utgift för lånets månadsbetalning.</small></div>
          </div>
        </article>
      </section>

      <form className="loan-form" onSubmit={onSaveLoan}>
        <div><span>Lån</span><b>{editingLoanId ? "Redigera lån" : "Lägg till lån"}</b></div>
        <input placeholder="Namn, t.ex. Billån" value={loanForm.name} onChange={(event) => onLoanFormChange((form) => ({ ...form, name: event.target.value }))}/>
        <input inputMode="decimal" placeholder="Kvar att betala" value={loanForm.remainingAmount} onChange={(event) => onLoanFormChange((form) => ({ ...form, remainingAmount: event.target.value }))}/>
        <input inputMode="decimal" placeholder="Månadsbetalning" value={loanForm.monthlyPayment} onChange={(event) => onLoanFormChange((form) => ({ ...form, monthlyPayment: event.target.value }))}/>
        <input inputMode="decimal" placeholder="Ränta %, t.ex. 5,2" value={loanForm.interestRate} onChange={(event) => onLoanFormChange((form) => ({ ...form, interestRate: event.target.value }))}/>
        <input inputMode="numeric" min="1" max="28" placeholder="Dras dag" value={loanForm.paymentDay} onChange={(event) => onLoanFormChange((form) => ({ ...form, paymentDay: event.target.value }))}/>
        <button disabled={saving} type="submit"><Plus size={16}/> {saving ? "Sparar..." : editingLoanId ? "Spara l?n" : "L?gg till"}</button>
        {editingLoanId && <button className="secondary-action" onClick={onResetLoanForm} type="button">Avbryt</button>}
      </form>
    </>
  );
}
