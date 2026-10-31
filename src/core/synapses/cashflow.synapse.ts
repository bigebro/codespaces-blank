export interface CashflowInputs {
  initialCash: number;
  initialBank: number;
  cashRevenue: number;
  bankRevenue: number;
  purchasesCashPaid: number;
  purchasesBankPaid: number;
  adjustedOpex: number;
  ownerDraws: number;
  fixedAssetsPaidBank: number;
}

export function reconcileCashflow(inputs: CashflowInputs) {
  const cashOutOpexCash = Math.round(inputs.adjustedOpex * 0.2);
  const cashOutOpexBank = Math.round(inputs.adjustedOpex * 0.8);
  const cashDraw = Math.round(inputs.ownerDraws * 0.3);
  const bankDraw = Math.round(inputs.ownerDraws * 0.7);

  const endCashBalance =
    inputs.initialCash +
    inputs.cashRevenue -
    inputs.purchasesCashPaid -
    cashOutOpexCash -
    cashDraw;

  const endBankBalance =
    inputs.initialBank +
    inputs.bankRevenue -
    inputs.purchasesBankPaid -
    cashOutOpexBank -
    bankDraw -
    inputs.fixedAssetsPaidBank;

  return {
    initialCash: inputs.initialCash,
    initialBank: inputs.initialBank,
    cashRevenue: inputs.cashRevenue,
    bankRevenue: inputs.bankRevenue,
    totalRevenue: inputs.cashRevenue + inputs.bankRevenue,
    purchasesCashPaid: inputs.purchasesCashPaid,
    purchasesBankPaid: inputs.purchasesBankPaid,
    cashOutOpexCash,
    cashOutOpexBank,
    ownerDraws: inputs.ownerDraws,
    fixedAssetsPaidBank: inputs.fixedAssetsPaidBank,
    endCashBalance,
    endBankBalance,
    netTotalBalance: endCashBalance + endBankBalance,
  };
}