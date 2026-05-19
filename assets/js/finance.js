import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";
import { statusLabel, t } from "./i18n.js";

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
  const periodSelect = qs("#dashboard-period");

  const renderDashboard = () => {
    const period = periodSelect?.value || "month";
    const filteredTransactions = filterByPeriod(finance.transactions, period, "date");
    const filteredBookings = filterByPeriod(bookings, period, "date");
    const income = sumTransactions(filteredTransactions, "income");
    const expense = sumTransactions(filteredTransactions, "expense");
    const periodLabel = t(PERIODS[period]?.labelKey || "monthly");

    renderList(statsRoot, [
      [t("totalRevenue"), formatIDR(income), periodLabel, "D"],
      [t("netBalance"), formatIDR(income - expense), periodLabel, "B"],
      [t("bookings"), filteredBookings.length, periodLabel, "R"],
      [t("occupancy"), "86%", `${filteredBookings.length} ${t("activeBookings")}`, "O"]
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
    renderCustomers(customers);
    drawRevenueChart(buildRevenueSeries(filteredTransactions, period));
  };

  periodSelect?.addEventListener("change", renderDashboard);
  renderDashboard();
}

function renderTransactions(transactions) {
  if (!transactions.length) {
    const rows = qs("#transaction-rows");
    if (rows) rows.innerHTML = `<tr><td colspan="5" class="text-center text-white/50">${t("noTransactions")}</td></tr>`;
    return;
  }

  renderList("#transaction-rows", transactions.slice(0, 7), (item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.description}</td>
      <td>${item.channel}</td>
      <td class="${item.type === "income" ? "text-emerald-200" : "text-red-200"}">${formatIDR(item.amount)}</td>
      <td><span class="status-pill status-${item.status}">${statusLabel(item.status)}</span></td>
    </tr>`);
}

function renderCustomers(customers) {
  renderList("#customer-activity", customers.slice(0, 5), (customer) => `
    <article class="flex items-center justify-between rounded-2xl bg-white/[.04] p-4">
      <div>
        <p class="font-semibold">${customer.name}</p>
        <p class="text-sm text-white/50">${customer.segment} - ${customer.lastVisit}</p>
      </div>
      <span class="text-gold">${customer.ltv}</span>
    </article>`);
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + item.amount, 0);
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
