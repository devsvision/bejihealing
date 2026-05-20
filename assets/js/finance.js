import { api } from "./api.js";
import { durationToMinutes, formatIDR, qs, renderList } from "./core.js";
import { toast } from "./helper.js";
import { statusLabel, t } from "./i18n.js";

const FINANCE_STORAGE_KEY = "beji-finance-transactions";
const CASH_CHANNELS = ["Cash", "Offline"];
const BANK_CHANNELS = ["Kartu Kredit", "Kartu Debit", "Bank Transfer", "Midtrans", "HitPay", "OttoPay"];
const GATEWAY_CONFIG = [
  { id: "midtrans", name: "Midtrans", feeRate: 0.029 },
  { id: "hitpay", name: "HitPay", feeRate: 0.027 },
  { id: "ottopay", name: "OttoPay", feeRate: 0.007 }
];

const ACCOUNT_POSITIONS = [
  { code: "111", name: "Kas", normal: "debit", group: "Aset Lancar" },
  { code: "112", name: "Bank", normal: "debit", group: "Aset Lancar" },
  { code: "113", name: "Piutang Usaha", normal: "debit", group: "Aset Lancar" },
  { code: "114", name: "Persediaan", normal: "debit", group: "Aset Lancar" },
  { code: "121", name: "Peralatan", normal: "debit", group: "Aset Tetap" },
  { code: "211", name: "Utang Usaha", normal: "credit", group: "Liabilitas" },
  { code: "214", name: "Utang Pajak", normal: "credit", group: "Liabilitas" },
  { code: "311", name: "Modal Pemilik", normal: "credit", group: "Ekuitas" },
  { code: "411", name: "Pendapatan Layanan", normal: "credit", group: "Pendapatan" },
  { code: "412", name: "Pendapatan Paket Healing", normal: "credit", group: "Pendapatan" },
  { code: "511", name: "Beban Healer", normal: "debit", group: "Beban" },
  { code: "512", name: "Beban Operasional", normal: "debit", group: "Beban" },
  { code: "513", name: "Beban Persediaan", normal: "debit", group: "Beban" },
  { code: "514", name: "Beban Payment Gateway", normal: "debit", group: "Beban" }
];

const TRANSACTION_TEMPLATES = [
  { id: "service-income-cash", label: "Pendapatan layanan diterima cash", type: "income", debitAccount: "111", creditAccount: "411" },
  { id: "service-income-bank", label: "Pendapatan layanan masuk bank/gateway", type: "income", debitAccount: "112", creditAccount: "411" },
  { id: "package-income", label: "Pendapatan healing package", type: "income", debitAccount: "112", creditAccount: "412" },
  { id: "booking-receivable", label: "Booking belum dibayar / piutang", type: "income", debitAccount: "113", creditAccount: "411" },
  { id: "receivable-payment", label: "Pelunasan piutang booking", type: "income", debitAccount: "112", creditAccount: "113" },
  { id: "inventory-purchase-cash", label: "Pembelian persediaan tunai", type: "expense", debitAccount: "114", creditAccount: "111" },
  { id: "inventory-purchase-payable", label: "Pembelian persediaan kredit", type: "expense", debitAccount: "114", creditAccount: "211" },
  { id: "healer-expense", label: "Pembayaran fee healer", type: "expense", debitAccount: "511", creditAccount: "112" },
  { id: "operational-expense", label: "Beban operasional", type: "expense", debitAccount: "512", creditAccount: "111" },
  { id: "gateway-fee", label: "Biaya payment gateway", type: "expense", debitAccount: "514", creditAccount: "112" },
  { id: "tax-payable", label: "Pencatatan utang pajak", type: "expense", debitAccount: "512", creditAccount: "214" },
  { id: "payable-payment", label: "Pembayaran utang supplier", type: "expense", debitAccount: "211", creditAccount: "112" }
];

const PERIODS = {
  week: { labelKey: "weekly", days: 7 },
  month: { labelKey: "monthly", months: 1 },
  "3-months": { labelKey: "threeMonths", months: 3 },
  "6-months": { labelKey: "sixMonths", months: 6 },
  "1-year": { labelKey: "oneYear", months: 12 },
  "2-years": { labelKey: "twoYears", months: 24 },
  "3-years": { labelKey: "threeYears", months: 36 }
};

export async function initDashboardPage() {
  const statsRoot = qs("#stats-root");
  if (!statsRoot) return;
  const [bookings, finance, customers] = await Promise.all([api.bookings(), api.finance(), api.customers()]);
  finance.transactions = loadTransactions(finance.transactions);
  const periodSelect = qs("#dashboard-period");
  bindTransactionForm(finance);
  bindInvoiceTable(bookings);
  applyFinanceSectionVisibility();
  applyCustomerSectionVisibility();

  const renderDashboard = () => {
    const period = periodSelect?.value || "month";
    const filteredTransactions = filterByPeriod(finance.transactions, period, "date");
    const filteredBookings = filterByPeriod(bookings, period, "date");
    const income = sumTransactions(filteredTransactions, "income");
    const expense = sumTransactions(filteredTransactions, "expense");
    const periodLabel = t(PERIODS[period]?.labelKey || "monthly");
    const todayMetrics = buildTodayServiceMetrics(bookings);

    renderList(statsRoot, [
      [t("totalRevenue"), formatIDR(income), periodLabel, "D"],
      [t("netBalance"), formatIDR(income - expense), periodLabel, "B"],
      [t("bookings"), filteredBookings.length, periodLabel, "R"],
      [t("todayOrders"), `${todayMetrics.orderCount} pesanan`, `${formatIDR(todayMetrics.revenue)} - ${todayMetrics.activeHealers} healer aktif melayani`, "H"]
    ], ([label, value, hint, icon]) => `
      <article class="stat-card glass-card luxury-border hover-lift">
        <div class="flex items-center justify-between">
          <span class="text-white/50 text-sm">${label}</span>
          <span class="grid size-10 place-items-center rounded-full bg-gold/10 text-gold">${icon}</span>
        </div>
        <p class="mt-5 font-display text-3xl text-white">${value}</p>
        <p class="mt-2 text-sm text-emerald-200">${hint}</p>
      </article>`);

    renderTransactions(filteredTransactions);
    renderInvoices(bookings);
    renderGatewaySettlement(bookings, finance.transactions);
    renderCustomers(customers, bookings);
    drawRevenueChart(buildRevenueSeries(filteredTransactions, period));
  };

  periodSelect?.addEventListener("change", renderDashboard);
  document.addEventListener("finance:transactions-change", renderDashboard);
  renderDashboard();
}

function renderInvoices(bookings) {
  const rows = qs("#invoice-rows");
  if (!rows) return;
  qs("#invoice-total-label").textContent = `${bookings.length} invoice`;
  const sortedBookings = [...bookings].sort((a, b) => `${b.createdAt || b.date}`.localeCompare(`${a.createdAt || a.date}`));

  renderList(rows, sortedBookings, (booking) => `
    <tr>
      <td>${invoiceNumber(booking)}</td>
      <td>${booking.createdAt || booking.date}</td>
      <td>
        <p class="font-semibold text-white">${booking.guest}</p>
        <p class="text-xs text-white/45">${booking.email}</p>
      </td>
      <td>
        <p class="font-semibold text-white">${booking.serviceType}</p>
        <p class="text-xs text-white/45">${booking.serviceCategory}</p>
      </td>
      <td>
        <p>${booking.paymentProvider}</p>
        <p class="text-xs text-white/45">${invoicePaymentStatus(booking.paymentStatus)}</p>
      </td>
      <td>${formatIDR(booking.amount)}</td>
      <td><span class="status-pill status-${booking.status}">${invoiceStatusLabel(booking.status)}</span></td>
      <td>
        <button class="ghost-button !min-h-10 !px-4" type="button" data-invoice-view="${booking.id}">
          <i data-lucide="eye" class="size-4"></i>View
        </button>
      </td>
    </tr>`);
  window.lucide?.createIcons();
}

function applyFinanceSectionVisibility() {
  const root = qs("[data-finance-page]");
  if (!root) return;
  const activeLink = qs('[data-route="finance"][data-section].is-active');
  const storedSection = sessionStorage.getItem("beji-active-finance-section");
  const requestedSection = activeLink?.dataset.section || storedSection || "finance-overview";
  const activeSection = root.querySelector(`[data-finance-section="${requestedSection}"]`) ? requestedSection : "finance-overview";
  if (activeSection !== storedSection) sessionStorage.setItem("beji-active-finance-section", activeSection);
  root.dataset.activeFinanceSection = activeSection;
  root.querySelectorAll("[data-finance-section]").forEach((section) => {
    section.hidden = section.dataset.financeSection !== activeSection;
  });
}

function applyCustomerSectionVisibility() {
  const root = qs("[data-customer-page]");
  if (!root) return;
  const activeLink = qs('[data-route="customers"][data-section].is-active');
  const activeSection = activeLink?.dataset.section || "customer-list";
  root.querySelectorAll("[data-customer-section]").forEach((section) => {
    section.hidden = section.dataset.customerSection !== activeSection;
  });
}

function renderGatewaySettlement(bookings, transactions) {
  const rows = qs("#gateway-settlement-rows");
  const cards = qs("#gateway-settlement-cards");
  if (!rows || !cards) return;

  const summaries = GATEWAY_CONFIG.map((gateway) => buildGatewaySummary(gateway, bookings, transactions));
  renderList(cards, summaries, (summary) => `
    <article class="rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <p class="text-xs uppercase tracking-[.18em] text-white/40">${summary.name}</p>
      <p class="mt-3 font-display text-3xl text-gold">${formatIDR(summary.readyToSettle)}</p>
      <p class="mt-2 text-sm text-white/55">${summary.totalRecords} records synced</p>
      <span class="status-pill ${summary.pending ? "status-pending" : "status-confirmed"} mt-4 inline-flex">
        ${summary.pending ? "Needs review" : "Ready"}
      </span>
    </article>`);

  renderList(rows, summaries, (summary) => `
    <tr>
      <td>
        <p class="font-semibold text-white">${summary.name}</p>
        <p class="text-xs text-white/45">${summary.totalRecords} synced records</p>
      </td>
      <td>${formatIDR(summary.gross)}</td>
      <td>${formatIDR(summary.fee)}</td>
      <td class="text-emerald-200">${formatIDR(summary.readyToSettle)}</td>
      <td class="text-amber-200">${formatIDR(summary.pending)}</td>
      <td class="text-red-200">${formatIDR(summary.refund)}</td>
      <td>${summary.lastSync}</td>
    </tr>`);

  const syncButton = qs("[data-gateway-sync]");
  if (syncButton) syncButton.onclick = () => {
    renderGatewaySettlement(bookings, transactions);
    toast("Gateway settlement synced from current transaction and booking data.");
  };
}

function buildGatewaySummary(gateway, bookings, transactions) {
  const gatewayBookings = bookings.filter((booking) => normalizeGatewayName(booking.paymentProvider) === gateway.id);
  const manualGatewayTransactions = transactions.filter((transaction) => transaction.isManual && normalizeGatewayName(transaction.channel) === gateway.id);
  const settlementRecords = [...gatewayBookings, ...manualGatewayTransactions];
  const paidRecords = settlementRecords.filter((record) => isSettlementReady(record));
  const pendingRecords = settlementRecords.filter((record) => isSettlementPending(record));
  const refundRecords = settlementRecords.filter((record) => isSettlementRefund(record));

  const gross = sumAmounts(paidRecords);
  const pending = sumAmounts(pendingRecords);
  const refund = sumAmounts(refundRecords);
  const fee = Math.round(gross * gateway.feeRate);
  const lastDate = settlementRecords
    .map((item) => item.createdAt || item.date)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    name: gateway.name,
    gross,
    pending,
    refund,
    fee,
    readyToSettle: Math.max(gross - fee - refund, 0),
    totalRecords: settlementRecords.length,
    lastSync: lastDate ? `${lastDate} 09:00` : "-"
  };
}

function normalizeGatewayName(value = "") {
  const lower = String(value).toLowerCase();
  if (lower.includes("midtrans")) return "midtrans";
  if (lower.includes("hitpay")) return "hitpay";
  if (lower.includes("otto")) return "ottopay";
  return "";
}

function isSettledStatus(status = "") {
  return ["paid", "completed", "confirmed"].includes(String(status).toLowerCase());
}

function isPendingStatus(status = "") {
  return ["pending", "waiting"].includes(String(status).toLowerCase());
}

function isRefundStatus(status = "") {
  return ["cancelled", "refunded", "refund"].includes(String(status).toLowerCase());
}

function isSettlementReady(record) {
  return isSettledStatus(record.status) || invoicePaymentStatus(record.paymentStatus).toLowerCase().includes("paid");
}

function isSettlementPending(record) {
  return isPendingStatus(record.status) || invoicePaymentStatus(record.paymentStatus).toLowerCase().includes("waiting");
}

function isSettlementRefund(record) {
  return isRefundStatus(record.status) || invoicePaymentStatus(record.paymentStatus).toLowerCase().includes("refund");
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function bindInvoiceTable(bookings) {
  const rows = qs("#invoice-rows");
  if (!rows || rows.dataset.bound) return;
  rows.dataset.bound = "true";
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-invoice-view]");
    if (!button) return;
    const booking = bookings.find((item) => item.id === button.dataset.invoiceView);
    if (booking) openInvoiceModal(booking);
  });
}

function renderTransactions(transactions) {
  if (!transactions.length) {
    const rows = qs("#transaction-rows");
    if (rows) rows.innerHTML = `<tr><td colspan="9" class="text-center text-white/50">${t("noTransactions")}</td></tr>`;
    return;
  }

  const sortedTransactions = [...transactions].sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
  renderList("#transaction-rows", sortedTransactions.slice(0, 12), (item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.reference || "-"}</td>
      <td>${formatAccount(item.debitAccount)}</td>
      <td>${formatAccount(item.creditAccount)}</td>
  <td>${item.description}</td>
      <td>${formatChannel(item)}</td>
      <td class="text-emerald-200">${formatIDR(item.debit || item.amount)}</td>
      <td class="text-red-200">${formatIDR(item.credit || item.amount)}</td>
      <td><span class="status-pill status-${item.status}">${statusLabel(item.status)}</span></td>
    </tr>`);
}

function bindTransactionForm(finance) {
  const form = qs("#transaction-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  populateTransactionKindSelect(form.elements.transactionKind);
  form.elements.date.value = new Date().toISOString().slice(0, 10);
  form.elements.reference.value = nextTransactionReference(finance.transactions);
  updateAutoJournal(form);

  form.elements.transactionKind.addEventListener("change", () => updateAutoJournal(form));
  form.elements.channel.addEventListener("change", () => {
    updatePaymentDetailFields(form);
    updateAutoJournal(form);
  });
  updatePaymentDetailFields(form);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const amount = Number(payload.amount || 0);
    if (!amount) {
      toast("Nominal transaksi wajib lebih dari 0.");
      return;
    }
    updateAutoJournal(form);
    payload.type = form.elements.type.value;
    payload.debitAccount = form.elements.debitAccount.value;
    payload.creditAccount = form.elements.creditAccount.value;

    const transaction = {
      id: nextTransactionId(finance.transactions),
      date: payload.date,
      reference: payload.reference,
      description: payload.description,
      channel: payload.channel,
      cashBox: CASH_CHANNELS.includes(payload.channel) ? payload.cashBox || "" : "",
      bankName: BANK_CHANNELS.includes(payload.channel) ? payload.bankName || "" : "",
      type: payload.type,
      amount,
      debit: amount,
      credit: amount,
      debitAccount: payload.debitAccount,
      creditAccount: payload.creditAccount,
      status: payload.status,
      isManual: true
    };

    finance.transactions = [transaction, ...finance.transactions];
    saveTransactions(finance.transactions);
    form.reset();
    form.elements.date.value = new Date().toISOString().slice(0, 10);
    form.elements.reference.value = nextTransactionReference(finance.transactions);
    updatePaymentDetailFields(form);
    updateAutoJournal(form);
    document.dispatchEvent(new CustomEvent("finance:transactions-change"));
    toast("Transaksi tersimpan. Jurnal debit dan kredit seimbang.");
  });
}

function populateTransactionKindSelect(select) {
  if (!select) return;
  select.innerHTML = TRANSACTION_TEMPLATES
    .map((template) => `<option value="${template.id}">${template.label}</option>`)
    .join("");
}

function updateAutoJournal(form) {
  const template = getTransactionTemplate(form.elements.transactionKind.value);
  if (!template) return;
  const accounts = accountPairForChannel(template, form.elements.channel.value);
  form.elements.type.value = template.type;
  form.elements.debitAccount.value = accounts.debitAccount;
  form.elements.creditAccount.value = accounts.creditAccount;
  const debitPreview = qs("[data-debit-preview]", form);
  const creditPreview = qs("[data-credit-preview]", form);
  if (debitPreview) debitPreview.textContent = formatAccount(accounts.debitAccount);
  if (creditPreview) creditPreview.textContent = formatAccount(accounts.creditAccount);
}

function getTransactionTemplate(id) {
  return TRANSACTION_TEMPLATES.find((template) => template.id === id) || TRANSACTION_TEMPLATES[0];
}

function accountPairForChannel(template, channel) {
  const liquidAccount = liquidAccountForChannel(channel);
  return {
    debitAccount: ["111", "112"].includes(template.debitAccount) ? liquidAccount : template.debitAccount,
    creditAccount: ["111", "112"].includes(template.creditAccount) ? liquidAccount : template.creditAccount
  };
}

function liquidAccountForChannel(channel) {
  return CASH_CHANNELS.includes(channel) ? "111" : "112";
}

function updatePaymentDetailFields(form) {
  const isCash = CASH_CHANNELS.includes(form.elements.channel.value);
  const isBank = BANK_CHANNELS.includes(form.elements.channel.value);
  qs("[data-cash-field]", form)?.classList.toggle("hidden", !isCash);
  qs("[data-bank-field]", form)?.classList.toggle("hidden", !isBank);
}

function loadTransactions(seedTransactions = []) {
  const normalizedSeed = seedTransactions.map(normalizeTransaction);
  const stored = localStorage.getItem(FINANCE_STORAGE_KEY);
  if (!stored) return normalizedSeed;
  try {
    const manualTransactions = JSON.parse(stored).map(normalizeTransaction);
    const manualIds = new Set(manualTransactions.map((item) => item.id));
    return [...manualTransactions, ...normalizedSeed.filter((item) => !manualIds.has(item.id))];
  } catch {
    localStorage.removeItem(FINANCE_STORAGE_KEY);
    return normalizedSeed;
  }
}

function saveTransactions(transactions) {
  const manualTransactions = transactions.filter((item) => item.isManual || String(item.id).startsWith("TRX-M"));
  localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(manualTransactions));
}

function normalizeTransaction(transaction) {
  const type = transaction.type || inferTransactionType(transaction);
  const debitAccount = transaction.debitAccount || defaultDebitAccount(type, transaction.channel);
  const creditAccount = transaction.creditAccount || defaultCreditAccount(type, transaction.channel);
  const amount = Number(transaction.amount || transaction.debit || transaction.credit || 0);
  return {
    ...transaction,
    type,
    amount,
    debit: Number(transaction.debit || amount),
    credit: Number(transaction.credit || amount),
    debitAccount,
    creditAccount,
    cashBox: transaction.cashBox || "",
    bankName: transaction.bankName || "",
    reference: transaction.reference || transaction.id,
    isManual: Boolean(transaction.isManual || String(transaction.id).startsWith("TRX-M"))
  };
}

function inferTransactionType(transaction) {
  if (transaction.creditAccount && ["411", "412"].includes(transaction.creditAccount)) return "income";
  if (transaction.debitAccount && transaction.debitAccount.startsWith("5")) return "expense";
  return transaction.type || "income";
}

function defaultDebitAccount(type, channel) {
  if (type === "expense") {
    if (String(channel).toLowerCase().includes("inventory")) return "513";
    if (String(channel).toLowerCase().includes("bank")) return "512";
    return "512";
  }
  if (String(channel).toLowerCase().includes("bank")) return "112";
  return "111";
}

function defaultCreditAccount(type, channel) {
  if (type === "expense") {
    if (String(channel).toLowerCase().includes("bank")) return "112";
    return "111";
  }
  if (String(channel).toLowerCase().includes("package")) return "412";
  return "411";
}

function formatAccount(code) {
  const account = ACCOUNT_POSITIONS.find((item) => item.code === code);
  return account ? `${account.code} - ${account.name}` : code || "-";
}

function formatChannel(transaction) {
  if (transaction.cashBox) return `${transaction.channel} - ${transaction.cashBox}`;
  if (transaction.bankName) return `${transaction.channel} - ${transaction.bankName}`;
  return transaction.channel;
}

function nextTransactionId(transactions) {
  return `TRX-M${String(transactions.filter((item) => String(item.id).startsWith("TRX-M")).length + 1).padStart(4, "0")}`;
}

function nextTransactionReference(transactions) {
  return `BK-${String(transactions.length + 1).padStart(4, "0")}`;
}

function openInvoiceModal(booking) {
  const modal = qs("#modal-root");
  if (!modal) return;
  const subtotal = Number(booking.amount || 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const duration = formatInvoiceDuration(booking);
  const guests = Number(booking.guests || 0);
  const guestLabel = guests === 1 ? "guest" : "guests";
  const status = invoiceStatusLabel(booking.status);
  const paymentStatus = invoicePaymentStatus(booking.paymentStatus);
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-invoice-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-invoice-modal>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Invoice Detail</p>
            <h2 class="font-display text-3xl mt-2">${invoiceNumber(booking)}</h2>
            <p class="mt-2 text-white/55">${booking.guest} - ${booking.serviceType}</p>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-invoice-close aria-label="Close">
            <i data-lucide="x" class="size-4"></i>
          </button>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${detailBox("Customer", `${booking.guest}<br>${booking.email}<br>${booking.phone}<br>${booking.country}`)}
          ${detailBox("Booking", `${booking.id}<br>${booking.bookingChannel}<br>${booking.date} ${booking.sessionTime}<br>${booking.location}`)}
          ${detailBox("Service", `${booking.serviceCategory}<br>${booking.serviceType}<br>${duration}<br>${booking.guests} ${guestLabel}`)}
          ${detailBox("Healer", `${booking.healer}<br>${booking.healerRole}<br>${booking.language}<br>${booking.pickup}`)}
          ${detailBox("Payment", `${booking.paymentProvider}<br>${paymentStatus}<br><span class="status-pill status-${booking.status}">${status}</span>`)}
          ${detailBox("Notes", booking.notes)}
        </div>

        <div class="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div class="flex justify-between gap-4"><span>Subtotal</span><b>${formatIDR(subtotal)}</b></div>
          <div class="mt-2 flex justify-between gap-4"><span>VAT 11%</span><b>${formatIDR(tax)}</b></div>
          <div class="mt-3 flex justify-between gap-4 border-t border-white/10 pt-3 text-lg"><span>Total Invoice</span><b class="text-gold">${formatIDR(total)}</b></div>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button class="ghost-button" type="button" data-print-receipt="${booking.id}">
            <i data-lucide="receipt" class="size-4"></i>Print Receipt
          </button>
          <button class="luxury-button" type="button" data-print-invoice="${booking.id}">
            <i data-lucide="printer" class="size-4"></i>Print Invoice
          </button>
        </div>
      </article>
    </section>`;

  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("[data-print-invoice]")) printInvoice(booking);
    if (event.target.closest("[data-print-receipt]")) printReceipt(booking);
    if (event.target.closest("button[data-invoice-close]")) modal.innerHTML = "";
    if (event.target.closest("[data-invoice-close]") && !event.target.closest("[data-invoice-modal]")) modal.innerHTML = "";
  };
}

function detailBox(label, value) {
  return `
    <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <p class="text-xs uppercase tracking-[.18em] text-white/40">${label}</p>
      <div class="mt-2 text-sm leading-7 text-white/85">${value}</div>
    </div>`;
}

function printInvoice(booking) {
  const subtotal = Number(booking.amount || 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const duration = formatInvoiceDuration(booking);
  const status = invoiceStatusLabel(booking.status);
  const paymentStatus = invoicePaymentStatus(booking.paymentStatus);
  openPrintWindow(`Invoice ${invoiceNumber(booking)}`, `
    <!doctype html>
    <html>
      <head>
        <title>${invoiceNumber(booking)}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; font: 12px Arial, sans-serif; }
          .invoice { min-height: 273mm; display: grid; grid-template-rows: auto auto 1fr auto; gap: 14px; }
          header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 14px; }
          h1 { margin: 0; font-size: 34px; letter-spacing: 1px; }
          h2 { margin: 0 0 6px; font-size: 16px; }
          p { margin: 3px 0; line-height: 1.45; }
          .brand { max-width: 48%; }
          .meta { text-align: right; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
          .right { text-align: right; }
          .summary { margin-left: auto; width: 280px; }
          .summary div { display: flex; justify-content: space-between; padding: 7px 0; }
          .summary .total { border-top: 2px solid #111; font-size: 16px; font-weight: 700; }
          footer { border-top: 1px solid #ddd; padding-top: 10px; color: #555; display: flex; justify-content: space-between; gap: 20px; }
        </style>
      </head>
      <body>
        <section class="invoice">
          <header>
            <div class="brand">
          <h1>INVOICE</h1>
              <h2>Beji Healing</h2>
              <p>Jl. Barong No.17, Dauh Yeh Cani, Abiansemal, Bali 80352</p>
              <p>info@bejihealing.com | +62 813 9788 886</p>
            </div>
            <div class="meta">
              <p><b>No:</b> ${invoiceNumber(booking)}</p>
              <p><b>Date:</b> ${booking.createdAt || booking.date}</p>
              <p><b>Booking:</b> ${booking.id}</p>
              <p><b>Status:</b> ${status}</p>
            </div>
          </header>

          <div class="grid">
            <div class="box">
              <h2>Bill To</h2>
              <p><b>${booking.guest}</b></p>
              <p>${booking.email}</p>
              <p>${booking.phone}</p>
              <p>${booking.country}</p>
            </div>
            <div class="box">
              <h2>Schedule Details</h2>
              <p>${booking.date} ${booking.sessionTime}</p>
              <p>${booking.location}</p>
              <p>${booking.paymentProvider} - ${paymentStatus}</p>
            </div>
          </div>

          <main>
            <table>
              <thead><tr><th>Service Type</th><th>Healer</th><th>Duration</th><th class="right">Guests</th><th class="right">Amount</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>${booking.serviceType}</b><br>${booking.serviceCategory}<br>${booking.notes}</td>
                  <td>${booking.healer}<br>${booking.healerRole}</td>
                  <td>${duration}</td>
                  <td class="right">${booking.guests}</td>
                  <td class="right">${formatIDR(subtotal)}</td>
                </tr>
              </tbody>
            </table>
            <div class="summary">
              <div><span>Subtotal</span><b>${formatIDR(subtotal)}</b></div>
              <div><span>VAT 11%</span><b>${formatIDR(tax)}</b></div>
              <div class="total"><span>Total</span><b>${formatIDR(total)}</b></div>
            </div>
          </main>

          <footer>
            <p>This invoice is issued by the Beji Healing system.</p>
            <p>Invoice printer: ${getPrinterName("invoice")}</p>
          </footer>
        </section>
      </body>
    </html>`);
}

function printReceipt(booking) {
  const subtotal = Number(booking.amount || 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  openPrintWindow(`Struk ${booking.id}`, `
    <!doctype html>
    <html>
      <head>
        <title>Struk ${booking.id}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { margin: 0; color: #111; font: 11px "Courier New", monospace; }
          .receipt { width: 72mm; margin: 0 auto; }
          .center { text-align: center; }
          h1 { margin: 0; font-size: 16px; }
          p { margin: 3px 0; }
          .line { border-top: 1px dashed #111; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .item { margin: 7px 0; }
          .total { font-size: 13px; font-weight: 700; }
        </style>
      </head>
      <body>
        <section class="receipt">
          <div class="center">
            <h1>BEJI HEALING</h1>
            <p>Abiansemal, Bali</p>
            <p>+62 813 9788 886</p>
          </div>
          <div class="line"></div>
          <p>No: ${invoiceNumber(booking)}</p>
          <p>Booking: ${booking.id}</p>
          <p>Tgl: ${booking.createdAt || booking.date} ${booking.sessionTime}</p>
          <p>Kasir: Admin</p>
          <div class="line"></div>
          <div class="item">
            <p>${booking.serviceType}</p>
            <p>${booking.serviceCategory}</p>
            <div class="row"><span>${booking.guests} tamu</span><span>${formatIDR(subtotal)}</span></div>
          </div>
          <div class="line"></div>
          <div class="row"><span>Subtotal</span><span>${formatIDR(subtotal)}</span></div>
          <div class="row"><span>PPN 11%</span><span>${formatIDR(tax)}</span></div>
          <div class="row total"><span>TOTAL</span><span>${formatIDR(total)}</span></div>
          <div class="line"></div>
          <p>Bayar: ${booking.paymentProvider}</p>
          <p>Status: ${booking.paymentStatus}</p>
          <div class="line"></div>
          <p class="center">Terima kasih</p>
          <p class="center">Printer struk: ${getPrinterName("receipt")}</p>
        </section>
      </body>
    </html>`);
}

function openPrintWindow(title, html) {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function invoiceNumber(booking) {
  return `INV-${String(booking.createdAt || booking.date).replaceAll("-", "")}-${booking.id.replace("BKG-", "")}`;
}

function formatInvoiceDuration(item = {}) {
  const minutes = Number(item.durationMinutes || durationToMinutes(item.duration));
  if (!minutes) return item.duration || "-";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} hour${hours > 1 ? "s" : ""}`;
  if (!remainingMinutes) return hourLabel;
  return `${hourLabel} ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
}

function invoiceStatusLabel(status) {
  const labels = {
    paid: "Paid",
    confirmed: "Confirmed",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    waiting: "Waiting",
    "in-progress": "In Progress"
  };
  return labels[status] || status || "-";
}

function invoicePaymentStatus(status) {
  const labels = {
    "Paid in full": "Paid in Full",
    "Deposit received": "Deposit Received",
    "Waiting for payment": "Waiting for Payment",
    "Refund scheduled": "Refund Scheduled",
    "belum dibayar": "Unpaid",
    deposit: "Deposit",
    lunas: "Paid"
  };
  return labels[status] || status || "-";
}

function getPrinterName(type) {
  const key = type === "receipt" ? "beji-printer-receipt" : "beji-printer-invoice";
  return localStorage.getItem(key) || (type === "invoice" ? "Not configured" : "Belum disetel");
}

function renderCustomers(customers, bookings = []) {
  const rows = qs("#customer-rows");
  const totalLabel = qs("#customer-total-label");
  if (rows) {
    if (totalLabel) totalLabel.textContent = `${customers.length} pelanggan`;
    renderList(rows, customers, (customer) => `
      <tr>
        <td>${customer.id}</td>
        <td>
          <p class="font-semibold text-white">${customer.name}</p>
          <p class="text-xs text-white/45">${customer.segment}</p>
        </td>
        <td>${customer.segment}</td>
        <td>${customer.lastVisit}</td>
        <td class="text-gold">${customer.ltv}</td>
        <td>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-customer-view="${customer.id}" aria-label="View customer detail">
            <i data-lucide="eye" class="size-4"></i>
          </button>
        </td>
      </tr>`);
    bindCustomerTable(customers, bookings);
    window.lucide?.createIcons();
    return;
  }

  renderList("#customer-activity", customers.slice(0, 5), (customer) => `
    <article class="flex items-center justify-between rounded-2xl bg-white/[.04] p-4">
      <div>
        <p class="font-semibold">${customer.name}</p>
        <p class="text-sm text-white/50">${customer.segment} - ${customer.lastVisit}</p>
      </div>
      <span class="text-gold">${customer.ltv}</span>
    </article>`);
}

function bindCustomerTable(customers, bookings) {
  const rows = qs("#customer-rows");
  if (!rows || rows.dataset.bound) return;
  rows.dataset.bound = "true";
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-customer-view]");
    if (!button) return;
    const customer = customers.find((item) => item.id === button.dataset.customerView);
    if (customer) openCustomerModal(customer, bookings);
  });
}

function openCustomerModal(customer, bookings) {
  const modal = qs("#modal-root");
  if (!modal) return;
  const customerBookings = bookings.filter((booking) => booking.guest === customer.name);
  const latestBooking = customerBookings[0] || {};
  const totalAmount = customerBookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-customer-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6" data-customer-modal>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">Detail Pelanggan</p>
            <h2 class="font-display text-3xl mt-2">${customer.name}</h2>
            <p class="mt-2 text-white/55">${customer.id} - ${customer.segment}</p>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-customer-close aria-label="Tutup">
            <i data-lucide="x" class="size-4"></i>
          </button>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          ${detailBox("Profil", `Segment: ${customer.segment}<br>Kunjungan terakhir: ${customer.lastVisit}<br>Lifetime value: ${customer.ltv}<br>Total aktual: ${formatIDR(totalAmount)}`)}
          ${detailBox("Kontak", `${latestBooking.email || "-"}<br>${latestBooking.phone || "-"}<br>${latestBooking.country || "-"}`)}
          ${detailBox("Preferensi", `Bahasa: ${latestBooking.language || "-"}<br>Pickup: ${latestBooking.pickup || "-"}<br>Channel terakhir: ${latestBooking.bookingChannel || "-"}`)}
          ${detailBox("Catatan", latestBooking.notes || "-")}
        </div>

        <div class="mt-6">
          <h3 class="font-display text-2xl">Riwayat Booking</h3>
          <div class="table-scroll mt-4">
            <table class="lux-table">
              <thead><tr><th>Booking</th><th>Tanggal</th><th>Layanan</th><th>Healer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                ${customerBookings.length ? customerBookings.map((booking) => `
                  <tr>
                    <td>${booking.id}</td>
                    <td>${booking.date} ${booking.sessionTime}</td>
                    <td>${booking.serviceType}</td>
                    <td>${booking.healer}</td>
                    <td>${formatIDR(booking.amount)}</td>
                    <td><span class="status-pill status-${booking.status}">${statusLabel(booking.status)}</span></td>
                  </tr>`).join("") : `<tr><td colspan="6" class="text-center text-white/50">Belum ada riwayat booking.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>`;

  window.lucide?.createIcons();
  modal.onclick = (event) => {
    if (event.target.closest("button[data-customer-close]")) modal.innerHTML = "";
    if (event.target.closest("[data-customer-close]") && !event.target.closest("[data-customer-modal]")) modal.innerHTML = "";
  };
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + item.amount, 0);
}

function buildTodayServiceMetrics(bookings) {
  const today = localDateISO(new Date());
  const todayBookings = bookings.filter((booking) => booking.date === today && isOperationalBooking(booking));
  const revenue = todayBookings
    .filter((booking) => isRevenueBooking(booking))
    .reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  const activeHealers = new Set(todayBookings.map((booking) => booking.healer).filter(Boolean)).size;

  return {
    orderCount: todayBookings.length,
    revenue,
    activeHealers
  };
}

function isOperationalBooking(booking) {
  return !["cancelled", "refunded"].includes(String(booking.status || "").toLowerCase());
}

function isRevenueBooking(booking) {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.paymentStatus || "").toLowerCase();
  return ["paid", "confirmed", "completed"].includes(status) || /paid|deposit|lunas|settled/.test(paymentStatus);
}

function localDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterByPeriod(items, period, dateKey) {
  if (!items.length) return [];
  const referenceDate = getLatestDate(items, dateKey);
  const startDate = getPeriodStart(period, referenceDate);

  return items.filter((item) => {
    const itemDate = parseDate(item[dateKey]);
    return itemDate >= startDate && itemDate <= referenceDate;
  });
}

function getLatestDate(items, dateKey) {
  return items.reduce((latest, item) => {
    const itemDate = parseDate(item[dateKey]);
    return itemDate > latest ? itemDate : latest;
  }, parseDate(items[0][dateKey]));
}

function getPeriodStart(period, referenceDate) {
  const selected = PERIODS[period] || PERIODS.month;
  const start = new Date(referenceDate);

  if (selected.days) {
    start.setUTCDate(start.getUTCDate() - selected.days + 1);
    return start;
  }

  start.setUTCMonth(start.getUTCMonth() - selected.months);
  start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function buildRevenueSeries(transactions, period) {
  const incomeTransactions = transactions.filter((item) => item.type === "income");
  const groupByDay = period === "week" || period === "month";
  const revenueByPeriod = incomeTransactions.reduce((groups, item) => {
    const key = groupByDay ? item.date : item.date.slice(0, 7);
    groups.set(key, (groups.get(key) || 0) + item.amount);
    return groups;
  }, new Map());

  return [...revenueByPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, revenue]) => ({ label, revenue }));
}

function drawRevenueChart(monthly) {
  const canvas = qs("#revenue-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  if (!monthly.length) {
    ctx.fillStyle = "rgba(245,245,245,.52)";
    ctx.font = "14px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("noRevenue"), width / 2, height / 2);
    return;
  }

  const max = Math.max(...monthly.map((item) => item.revenue), 1);
  const points = monthly.map((item, index) => ({
    x: monthly.length === 1 ? width / 2 : 28 + index * ((width - 56) / (monthly.length - 1)),
    y: height - 32 - (item.revenue / max) * (height - 68)
  }));

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#1f6b52");
  gradient.addColorStop(1, "#d4af37");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke();
  points.forEach((point) => {
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}
