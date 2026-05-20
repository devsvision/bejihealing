import { api } from "./api.js";
import { formatIDR, qs } from "./core.js";

const FINANCE_STORAGE_KEY = "beji-finance-transactions";
const TAX_RATE = 0.22;
const VAT_RATE = 0.11;
const OPENING_EQUITY = 33200000;
const OPENING_FIXED_ASSETS = 20500000;
const ACCUMULATED_DEPRECIATION = 2000000;

const PERIODS = {
  month: { label: "Bulan berjalan" },
  quarter: { label: "Kuartal berjalan" },
  semester: { label: "Semester berjalan" },
  year: { label: "Tahun berjalan" },
  custom: { label: "Custom" }
};

const ACCOUNTS = {
  111: { name: "Kas", group: "Aset Lancar", normal: "debit" },
  112: { name: "Bank", group: "Aset Lancar", normal: "debit" },
  113: { name: "Piutang Usaha", group: "Aset Lancar", normal: "debit" },
  114: { name: "Persediaan", group: "Aset Lancar", normal: "debit" },
  121: { name: "Aset Tetap", group: "Aset Tetap", normal: "debit" },
  122: { name: "Akumulasi Penyusutan", group: "Aset Tetap", normal: "credit" },
  211: { name: "Utang Usaha", group: "Liabilitas", normal: "credit" },
  214: { name: "Utang Pajak", group: "Liabilitas", normal: "credit" },
  311: { name: "Modal & Laba Ditahan", group: "Ekuitas", normal: "credit" },
  411: { name: "Pendapatan Layanan", group: "Pendapatan", normal: "credit" },
  412: { name: "Pendapatan Paket Healing", group: "Pendapatan", normal: "credit" },
  511: { name: "Beban Healer", group: "Beban", normal: "debit" },
  512: { name: "Beban Operasional", group: "Beban", normal: "debit" },
  513: { name: "Beban Persediaan", group: "Beban", normal: "debit" },
  514: { name: "Beban Payment Gateway", group: "Beban", normal: "debit" }
};

export async function initReportsPage() {
  const root = qs("[data-report-page]");
  if (!root) return;
  const activeLink = qs('[data-route="reports"][data-section].is-active');
  const activeSection = activeLink?.dataset.section || "revenue-report";
  root.querySelectorAll("[data-report-section]").forEach((section) => {
    section.hidden = section.dataset.reportSection !== activeSection;
  });

  const sources = await loadReportSources();
  root.__reportSources = sources;
  bindFinancialPeriodFilter(root);
  bindBookingReportFilter(root);
  bindReportActions(root);
  updateFinancialReport(root);
  updateBookingReport(root);
}

async function loadReportSources() {
  const [finance, bookings] = await Promise.all([api.finance(), api.bookings()]);
  const seedTransactions = finance.transactions || [];
  const manualTransactions = readManualTransactions();
  return {
    bookings,
    transactions: [...manualTransactions, ...seedTransactions].map(normalizeTransaction)
  };
}

function bindFinancialPeriodFilter(root) {
  const form = qs("[data-financial-period-form]", root);
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  form.elements.period.addEventListener("change", () => {
    updateDateInputs(form);
    updateFinancialReport(root);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateFinancialReport(root);
  });
  updateDateInputs(form);
}

function bindReportActions(root) {
  if (root.dataset.reportActionsBound) return;
  root.dataset.reportActionsBound = "true";
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-report-action]");
    if (!button) return;
    const context = getPeriodContext(root);
    const reports = buildFinancialReports(root.__reportSources, context);
    const report = reports.find((item) => item.id === button.dataset.reportId);
    if (!report) return;
    if (button.dataset.reportAction === "view") openReportModal(report, context);
    if (button.dataset.reportAction === "excel") exportReportExcel(report, context);
    if (button.dataset.reportAction === "print") printReport(report, context);
  });
}

function bindBookingReportFilter(root) {
  const form = qs("[data-booking-report-filter]", root);
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateBookingReport(root);
  });
  form.addEventListener("reset", () => {
    setTimeout(() => updateBookingReport(root), 0);
  });
}

function updateDateInputs(form) {
  const isCustom = form.elements.period.value === "custom";
  form.elements.startDate.disabled = !isCustom;
  form.elements.endDate.disabled = !isCustom;
  if (isCustom) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const startDate = ["quarter", "semester", "year"].includes(form.elements.period.value)
    ? new Date(year, 0, 1)
    : new Date(year, month, 1);
  form.elements.startDate.value = formatInputDate(startDate);
  form.elements.endDate.value = formatInputDate(today);
}

function updateFinancialReport(root) {
  const cards = qs("#financial-report-cards", root);
  if (!cards || !root.__reportSources) return;
  const context = getPeriodContext(root);
  const reports = buildFinancialReports(root.__reportSources, context);
  cards.innerHTML = reports.map((report) => reportCard(report)).join("");

  const label = qs("[data-report-period-label]", root);
  if (label) label.textContent = `Periode: ${context.label} (${context.startDate} - ${context.endDate})`;
  window.lucide?.createIcons();
}

function updateBookingReport(root) {
  const rows = qs("#booking-report-rows", root);
  if (!rows || !root.__reportSources) return;
  const bookings = filterBookings(root.__reportSources.bookings, root);
  const totalAmount = bookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  const totalGuests = bookings.reduce((sum, booking) => sum + Number(booking.guests || 0), 0);
  const pendingCount = bookings.filter((booking) => String(booking.status).toLowerCase() === "pending").length;

  setText(root, '[data-booking-metric="count"]', bookings.length);
  setText(root, '[data-booking-metric="guests"]', totalGuests);
  setText(root, '[data-booking-metric="amount"]', formatCompactIDR(totalAmount));
  setText(root, '[data-booking-metric="pending"]', pendingCount);
  setText(root, "#booking-report-total", `${bookings.length} pesanan`);

  rows.innerHTML = bookings.length ? bookings.map((booking) => `
    <tr>
      <td>${booking.id}<br><span class="text-xs text-white/45">${booking.bookingChannel}</span></td>
      <td>${booking.date}<br><span class="text-xs text-white/45">${booking.sessionTime}</span></td>
      <td><p class="font-semibold text-white">${booking.guest}</p><p class="text-xs text-white/45">${booking.email}</p></td>
      <td><p>${booking.serviceType}</p><p class="text-xs text-white/45">${booking.serviceCategory}</p></td>
      <td>${booking.healer}<br><span class="text-xs text-white/45">${booking.healerRole}</span></td>
      <td>${booking.paymentProvider}<br><span class="text-xs text-white/45">${booking.paymentStatus}</span></td>
      <td>${formatIDR(booking.amount)}</td>
      <td><span class="status-pill status-${booking.status}">${booking.status}</span></td>
    </tr>`).join("") : `<tr><td colspan="8" class="text-center text-white/50">Tidak ada pesanan sesuai filter.</td></tr>`;
}

function filterBookings(bookings, root) {
  const form = qs("[data-booking-report-filter]", root);
  if (!form) return bookings;
  const data = Object.fromEntries(new FormData(form).entries());
  const keyword = String(data.search || "").toLowerCase().trim();
  return bookings
    .filter((booking) => !data.startDate || parseLocalDate(booking.date) >= parseLocalDate(data.startDate))
    .filter((booking) => !data.endDate || parseLocalDate(booking.date) <= parseLocalDate(data.endDate))
    .filter((booking) => !data.status || booking.status === data.status)
    .filter((booking) => !data.provider || String(booking.paymentProvider).toLowerCase().includes(String(data.provider).toLowerCase()))
    .filter((booking) => !data.category || booking.serviceCategory === data.category)
    .filter((booking) => !keyword || [booking.id, booking.guest, booking.email, booking.serviceType, booking.healer].some((value) => String(value || "").toLowerCase().includes(keyword)))
    .sort((a, b) => `${b.date} ${b.sessionTime}`.localeCompare(`${a.date} ${a.sessionTime}`));
}

function buildFinancialReports(sources, context) {
  const entries = buildJournalEntries(sources.transactions).filter((entry) => inPeriod(entry.date, context));
  const bookings = sources.bookings.filter((booking) => inPeriod(booking.createdAt || booking.date, context));
  const balances = buildAccountBalances(entries);
  const revenue = creditBalance(balances, ["411", "412"]);
  const expenses = debitBalance(balances, ["511", "512", "513", "514"]);
  const netProfit = revenue - expenses;
  const taxEstimate = Math.max(Math.round(netProfit * TAX_RATE), 0);
  const vatEstimate = Math.round(revenue * VAT_RATE);
  const cashBalance = debitBalance(balances, ["111"]);
  const bankBalance = debitBalance(balances, ["112"]);
  const receivable = estimateReceivable(bookings);
  const pendingGateway = estimatePendingGateway(bookings);
  const equityEnding = OPENING_EQUITY + netProfit;
  const fixedAssetBookValue = OPENING_FIXED_ASSETS - ACCUMULATED_DEPRECIATION;
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

  return [
    {
      id: "general-ledger",
      title: "Laporan Transaksi / Jurnal Umum",
      category: "Jurnal",
      description: "Sumber: input transaksi keuangan. Semua baris wajib punya debit dan kredit seimbang.",
      totalLabel: "Total jurnal",
      total: totalDebit,
      rows: entries.map((entry) => [entry.ref, entry.description, entry.debit, entry.credit, `${entry.accountCode} - ${accountName(entry.accountCode)}`])
    },
    {
      id: "profit-loss",
      title: "Laporan Laba Rugi",
      category: "Komersial & Fiskal",
      description: "Sumber: akun pendapatan dan beban dari jurnal umum.",
      totalLabel: "Laba bersih",
      total: netProfit,
      rows: accountRows(balances, ["411", "412", "511", "512", "513", "514"], "Saldo laba rugi")
        .concat([["NET", "Laba Bersih Periode Berjalan", netProfit < 0 ? Math.abs(netProfit) : 0, netProfit > 0 ? netProfit : 0, "Pendapatan dikurangi beban"]])
    },
    {
      id: "balance-sheet",
      title: "Laporan Posisi Keuangan / Neraca",
      category: "Neraca",
      description: "Sumber: saldo akun aset, kewajiban, modal, piutang booking, dan laba berjalan.",
      totalLabel: "Total aset",
      total: cashBalance + bankBalance + receivable + fixedAssetBookValue,
      rows: [
        ["111", "Kas", cashBalance, 0, "Dari transaksi kanal cash/offline"],
        ["112", "Bank", bankBalance, 0, "Dari transaksi bank/gateway"],
        ["113", "Piutang Usaha", receivable, 0, "Dari booking belum lunas"],
        ["121", "Aset Tetap", OPENING_FIXED_ASSETS, 0, "Saldo aset tetap awal/setup"],
        ["122", "Akumulasi Penyusutan", 0, ACCUMULATED_DEPRECIATION, "Kontra aset"],
        ["214", "Utang Pajak", 0, taxEstimate + vatEstimate, "Estimasi PPh Badan + PPN"],
        ["311", "Modal & Laba Ditahan", 0, equityEnding, "Modal awal + laba berjalan"]
      ]
    },
    {
      id: "trial-balance",
      title: "Neraca Saldo",
      category: "Kontrol",
      description: "Sumber: agregasi debit-kredit jurnal. Dipakai untuk cek keseimbangan sebelum tutup buku.",
      totalLabel: totalDebit === totalCredit ? "Debit = kredit" : "Tidak seimbang",
      total: totalDebit,
      rows: accountRows(balances, Object.keys(ACCOUNTS), "Saldo akun")
    },
    {
      id: "cash-flow",
      title: "Laporan Arus Kas",
      category: "Kas",
      description: "Sumber: akun kas dan bank dari jurnal transaksi.",
      totalLabel: "Kas bersih",
      total: cashBalance + bankBalance,
      rows: [
        ["CFO-01", "Kas masuk dari pelanggan", debitBalance(balances, ["111", "112"]), 0, "Debit kas/bank"],
        ["CFO-02", "Kas keluar operasional", 0, creditBalance(balances, ["111", "112"]), "Kredit kas/bank"],
        ["CFO-03", "Perubahan kas bersih", Math.max(cashBalance + bankBalance, 0), 0, "Saldo kas/bank akhir periode"]
      ]
    },
    {
      id: "equity-change",
      title: "Perubahan Ekuitas",
      category: "Ekuitas",
      description: "Sumber: modal awal/setup dan laba bersih dari laporan laba rugi.",
      totalLabel: "Ekuitas akhir",
      total: equityEnding,
      rows: [
        ["EQ-01", "Modal awal", 0, OPENING_EQUITY, "Saldo setup awal"],
        ["EQ-02", "Laba bersih berjalan", netProfit < 0 ? Math.abs(netProfit) : 0, netProfit > 0 ? netProfit : 0, "Dari laporan laba rugi"],
        ["EQ-03", "Prive / dividen", 0, 0, "Belum ada input"],
        ["EQ-04", "Ekuitas akhir", 0, equityEnding, "Saldo akhir"]
      ]
    },
    {
      id: "tax-summary",
      title: "Rekap Pajak Badan",
      category: "Pajak",
      description: "Sumber: pendapatan, beban, booking/invoice, dan estimasi pajak. Tarif dibuat rule agar mudah dipindah ke setting backend.",
      totalLabel: "Estimasi pajak",
      total: taxEstimate + vatEstimate,
      rows: [
        ["TAX-01", "Peredaran bruto", 0, revenue, "Dari akun pendapatan"],
        ["TAX-02", "Biaya dapat dikurangkan", expenses, 0, "Dari akun beban"],
        ["TAX-03", "Laba fiskal estimasi", 0, Math.max(netProfit, 0), "Pendapatan dikurangi beban"],
        ["TAX-04", "PPh Badan estimasi", 0, taxEstimate, `Rule tarif ${(TAX_RATE * 100).toFixed(0)}%`],
        ["TAX-05", "PPN keluaran estimasi", 0, vatEstimate, `Rule tarif ${(VAT_RATE * 100).toFixed(0)}%`]
      ]
    },
    {
      id: "bank-reconciliation",
      title: "Rekonsiliasi Bank",
      category: "Bank",
      description: "Sumber: transaksi kanal bank/gateway dan booking gateway yang belum settlement.",
      totalLabel: "Saldo bank",
      total: bankBalance,
      rows: [
        ["BANK-01", "Saldo menurut pembukuan", bankBalance, 0, "Akun 112 - Bank"],
        ["BANK-02", "Settlement gateway belum cair", pendingGateway, 0, "Booking gateway pending"],
        ["BANK-03", "Selisih rekonsiliasi", Math.max(bankBalance - pendingGateway, 0), 0, "Saldo setelah outstanding"]
      ]
    },
    {
      id: "fixed-assets",
      title: "Daftar Aset & Penyusutan",
      category: "Aset",
      description: "Sumber: saldo aset setup. Nanti ditarik dari modul inventaris/aset tetap dan penyusutan backend.",
      totalLabel: "Nilai buku",
      total: fixedAssetBookValue,
      rows: [
        ["FA-01", "Aset tetap perolehan", OPENING_FIXED_ASSETS, 0, "Setup saldo awal aset"],
        ["FA-02", "Akumulasi penyusutan", 0, ACCUMULATED_DEPRECIATION, "Setup penyusutan"],
        ["FA-03", "Nilai buku", fixedAssetBookValue, 0, "Nilai aset bersih"]
      ]
    }
  ];
}

function buildJournalEntries(transactions) {
  return transactions.flatMap((transaction) => {
    const amount = Number(transaction.amount || transaction.debit || transaction.credit || 0);
    const debitAccount = transaction.debitAccount || defaultDebitAccount(transaction);
    const creditAccount = transaction.creditAccount || defaultCreditAccount(transaction);
    return [
      {
        date: transaction.date,
        ref: transaction.reference || transaction.id,
        description: transaction.description,
        accountCode: debitAccount,
        debit: amount,
        credit: 0
      },
      {
        date: transaction.date,
        ref: transaction.reference || transaction.id,
        description: transaction.description,
        accountCode: creditAccount,
        debit: 0,
        credit: amount
      }
    ];
  });
}

function buildAccountBalances(entries) {
  return entries.reduce((balances, entry) => {
    if (!balances[entry.accountCode]) balances[entry.accountCode] = { debit: 0, credit: 0 };
    balances[entry.accountCode].debit += entry.debit;
    balances[entry.accountCode].credit += entry.credit;
    return balances;
  }, {});
}

function normalizeTransaction(transaction) {
  const amount = Number(transaction.amount || transaction.debit || transaction.credit || 0);
  return {
    ...transaction,
    amount,
    debitAccount: transaction.debitAccount || defaultDebitAccount(transaction),
    creditAccount: transaction.creditAccount || defaultCreditAccount(transaction),
    reference: transaction.reference || transaction.id
  };
}

function defaultDebitAccount(transaction) {
  if (transaction.type === "expense") {
    if (String(transaction.description || "").toLowerCase().includes("inventory")) return "114";
    if (String(transaction.description || "").toLowerCase().includes("healer")) return "511";
    return "512";
  }
  return cashAccountForChannel(transaction.channel);
}

function defaultCreditAccount(transaction) {
  if (transaction.type === "expense") return cashAccountForChannel(transaction.channel);
  if (String(transaction.channel || "").toLowerCase().includes("package")) return "412";
  return String(transaction.description || "").toLowerCase().includes("golden") ? "412" : "411";
}

function cashAccountForChannel(channel = "") {
  const lower = String(channel).toLowerCase();
  return lower.includes("cash") || lower.includes("offline") ? "111" : "112";
}

function accountRows(balances, codes, note) {
  return codes
    .filter((code) => balances[code])
    .map((code) => {
      const balance = balances[code];
      return [code, accountName(code), balance.debit, balance.credit, note || ACCOUNTS[code]?.group || "-"];
    });
}

function debitBalance(balances, codes) {
  return codes.reduce((sum, code) => sum + Number(balances[code]?.debit || 0), 0);
}

function creditBalance(balances, codes) {
  return codes.reduce((sum, code) => sum + Number(balances[code]?.credit || 0), 0);
}

function estimateReceivable(bookings) {
  return bookings
    .filter((booking) => ["pending", "waiting"].includes(String(booking.status).toLowerCase()) || String(booking.paymentStatus).toLowerCase().includes("waiting"))
    .reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
}

function estimatePendingGateway(bookings) {
  return bookings
    .filter((booking) => /midtrans|hitpay|otto/i.test(booking.paymentProvider || "") && String(booking.paymentStatus).toLowerCase().includes("waiting"))
    .reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
}

function readManualTransactions() {
  try {
    return JSON.parse(localStorage.getItem(FINANCE_STORAGE_KEY) || "[]");
  } catch {
    localStorage.removeItem(FINANCE_STORAGE_KEY);
    return [];
  }
}

function inPeriod(dateValue, context) {
  if (!dateValue) return false;
  const date = parseLocalDate(dateValue);
  return date >= parseLocalDate(context.startDate) && date <= parseLocalDate(context.endDate);
}

function parseLocalDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function reportCard(report) {
  return `
    <article class="rounded-2xl border border-white/10 bg-white/[.04] p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[.18em] text-white/40">${report.category}</p>
          <h3 class="font-display mt-2 text-2xl">${report.title}</h3>
        </div>
        <span class="status-pill status-confirmed">${report.rows.length} pos</span>
      </div>
      <p class="mt-3 min-h-[72px] text-sm leading-6 text-white/55">${report.description}</p>
      <div class="mt-4 rounded-2xl bg-black/20 p-3">
        <p class="text-xs uppercase tracking-[.18em] text-white/35">${report.totalLabel}</p>
        <p class="mt-2 font-display text-2xl text-gold">${formatCompactIDR(report.total)}</p>
      </div>
      <div class="mt-4 grid gap-2 sm:grid-cols-3">
        <button class="ghost-button !min-h-10 !px-3" type="button" data-report-action="view" data-report-id="${report.id}">
          <i data-lucide="eye" class="size-4"></i>Lihat
        </button>
        <button class="ghost-button !min-h-10 !px-3" type="button" data-report-action="excel" data-report-id="${report.id}">
          <i data-lucide="file-spreadsheet" class="size-4"></i>Excel
        </button>
        <button class="ghost-button !min-h-10 !px-3" type="button" data-report-action="print" data-report-id="${report.id}">
          <i data-lucide="printer" class="size-4"></i>Print
        </button>
      </div>
    </article>`;
}

function openReportModal(report, context) {
  const modal = qs("#modal-root");
  if (!modal) return;
  modal.innerHTML = `
    <section class="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" data-report-close>
      <article class="glass-card luxury-border max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6" data-report-modal>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="eyebrow">${report.category}</p>
            <h2 class="font-display text-3xl mt-2">${report.title}</h2>
            <p class="mt-2 text-white/55">Periode ${context.startDate} sampai ${context.endDate}</p>
          </div>
          <button class="ghost-button !min-h-10 !w-10 !px-0" type="button" data-report-close aria-label="Tutup">
            <i data-lucide="x" class="size-4"></i>
          </button>
        </div>
        ${reportTable(report, "mt-6")}
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button class="ghost-button" type="button" data-report-action="excel" data-report-id="${report.id}">Export Excel</button>
          <button class="luxury-button" type="button" data-report-action="print" data-report-id="${report.id}">Print</button>
        </div>
      </article>
    </section>`;
  window.lucide?.createIcons();
  modal.onclick = (event) => {
    const action = event.target.closest("[data-report-action]");
    if (action) {
      if (action.dataset.reportAction === "excel") exportReportExcel(report, context);
      if (action.dataset.reportAction === "print") printReport(report, context);
      return;
    }
    if (event.target.closest("button[data-report-close]")) modal.innerHTML = "";
    if (event.target.closest("[data-report-close]") && !event.target.closest("[data-report-modal]")) modal.innerHTML = "";
  };
}

function reportTable(report, className = "") {
  return `
    <div class="table-scroll ${className}">
      <table class="lux-table">
        <thead><tr><th>Kode</th><th>Uraian</th><th>Debit</th><th>Kredit</th><th>Keterangan / Sumber</th></tr></thead>
        <tbody>
          ${report.rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2] ? formatIDR(row[2]) : "-"}</td><td>${row[3] ? formatIDR(row[3]) : "-"}</td><td>${row[4]}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function exportReportExcel(report, context) {
  const lines = [
    [report.title],
    [`Periode ${context.startDate} sampai ${context.endDate}`],
    ["Kode", "Uraian", "Debit", "Kredit", "Keterangan"],
    ...report.rows
  ];
  const content = lines.map((line) => line.join("\t")).join("\n");
  const blob = new Blob([content], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${report.id}-${context.startDate}-${context.endDate}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function printReport(report, context) {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { color: #111; font: 12px Arial, sans-serif; margin: 24px; }
          h1 { margin-bottom: 4px; }
          p { margin-top: 0; color: #555; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p>Periode ${context.startDate} sampai ${context.endDate}</p>
        <table>
          <thead><tr><th>Kode</th><th>Uraian</th><th>Debit</th><th>Kredit</th><th>Keterangan</th></tr></thead>
          <tbody>
            ${report.rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${formatIDR(row[2])}</td><td>${formatIDR(row[3])}</td><td>${row[4]}</td></tr>`).join("")}
          </tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => printWindow.print();
}

function getPeriodContext(root) {
  const form = qs("[data-financial-period-form]", root);
  const selectedPeriod = form?.elements.period.value || "month";
  const period = PERIODS[selectedPeriod] || PERIODS.month;
  return {
    ...period,
    period: selectedPeriod,
    startDate: form?.elements.startDate.value || "",
    endDate: form?.elements.endDate.value || ""
  };
}

function accountName(code) {
  return ACCOUNTS[code]?.name || code;
}

function setText(root, selector, value) {
  const target = qs(selector, root);
  if (target) target.textContent = value;
}

function formatCompactIDR(value) {
  if (Math.abs(value) >= 1000000) return `IDR ${(value / 1000000).toFixed(1)}M`;
  return formatIDR(value);
}

function formatInputDate(date) {
  return date.toISOString().slice(0, 10);
}
