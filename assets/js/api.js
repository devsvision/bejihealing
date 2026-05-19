export async function getJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`API mock failed: ${path}`);
  return response.json();
}

export async function postJSON(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `API request failed: ${path}`);
  return data;
}

export const api = {
  bookings: () => getJSON("data/dummy-booking.json"),
  finance: () => getJSON("data/dummy-finance.json"),
  walkIns: () => getJSON("data/dummy-walkins.json"),
  services: () => getJSON("data/dummy-services.json"),
  healers: () => getJSON("data/dummy-healers.json"),
  products: () => getJSON("data/dummy-products.json"),
  customers: () => getJSON("data/dummy-customers.json"),
  createOttoPayPayment: (payload) => postJSON("/api/payments/ottopay/create", payload)
};
