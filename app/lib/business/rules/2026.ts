export const BUSINESS_RULES_2026 = {
  year: 2026,
  checkedOn: "2026-10-25",
  corporateTaxBasisPoints: 2060,
  standardEmployerContributionBasisPoints: 3142,
  youthEmployerContributionBasisPoints: 2081,
  youthReducedMonthlyLimitOre: 2_500_000,
  youthBirthYearFrom: 2003,
  youthBirthYearTo: 2007,
  youthReductionStartsOn: "2026-04-01",
  youthReductionEndsOn: "2027-09-30",
  standardSelfEmploymentBasisPoints: 2897,
  standardSelfEmploymentDeductionBasisPoints: 2500,
  stateIncomeTaxThresholdOre: 64_300_000,
  stateIncomeTaxBasisPoints: 2000,
  sources: {
    corporateTax: "https://www.skatteverket.se/foretag/drivaforetag/foretagsformer/aktiebolag.html",
    employerContributions: "https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/arbetsgivaravgifter.html",
    selfEmployment: "https://www.skatteverket.se/foretag/drivaforetag/foretagsformer/enskildnaringsverksamhet/egenavgifterochsarskildloneskatt.html",
    vat: "https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momssatserochundantagfranmoms.html",
  },
} as const;

