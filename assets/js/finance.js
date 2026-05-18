import { api } from "./api.js";
import { formatIDR, qs, renderList } from "./core.js";

export async function initDashboardPage() {
  const statsRoot = qs("#stats-root");
  if (!statsRoot) return;
  const [bookings, finance, customers] = await Promise.all([api.bookings(), api.finance(), api.customers()]);
  const income = finance.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = finance.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  renderList(statsRoot, [
    ["Total Revenue", formatIDR(income), "+18.4%", "D"],
    ["Net Balance", formatIDR(income - expense), "+11.2%", "B"],
    ["Bookings Today", bookings.length, "12 arrivals", "R"],
    ["Occupancy", "86%", "14 villas active", "O"]
  ], ([label, value, hint, icon]) => `
    <article class="stat-card glass-card luxury-border hover-lift">
      <div class="flex items-center justify-between">
        <span class="text-white/50 text-sm">${label}</span>
        <span class="grid size-10 place-items-center rounded-full bg-gold/10 text-gold">${icon}</span>
      </div>
      <p class="mt-5 font-display text-3xl text-white">${value}</p>
      <p class="mt-2 text-sm text-emerald-200">${hint}</p>
    </article>`);

  renderTransactions(finance.transactions);
  renderCustomers(customers);
  drawRevenueChart(finance.monthly);
}

function renderTransactions(transactions) {
  renderList("#transaction-rows", transactions.slice(0, 7), (item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.description}</td>
      <td>${item.channel}</td>
      <td class="${item.type === "income" ? "text-emerald-200" : "text-red-200"}">${formatIDR(item.amount)}</td>
      <td><span class="status-pill status-${item.status}">${item.status}</span></td>
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
  const max = Math.max(...monthly.map((item) => item.revenue));
  const points = monthly.map((item, index) => ({
    x: 28 + index * ((width - 56) / (monthly.length - 1)),
    y: height - 32 - (item.revenue / max) * (height - 68)
  }));

  ctx.clearRect(0, 0, width, height);
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
