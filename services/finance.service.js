export const financeSchema = {
  tables: {
    transactions: ["id", "type", "channel", "amount", "status", "gateway_reference", "booking_id", "created_at"],
    reconciliations: ["id", "provider", "settlement_date", "gross_amount", "fee_amount", "net_amount", "status"]
  }
};

export function summarizeTransactions(transactions) {
  return transactions.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.amount;
    return acc;
  }, {});
}
