export async function getJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`API mock failed: ${path}`);
  return response.json();
}

export const api = {
  bookings: () => getJSON("data/dummy-booking.json"),
  finance: () => getJSON("data/dummy-finance.json"),
  walkIns: () => getJSON("data/dummy-walkins.json"),
  services: () => getJSON("data/dummy-services.json"),
  healers: () => getJSON("data/dummy-healers.json"),
  products: () => getJSON("data/dummy-products.json"),
  customers: () => getJSON("data/dummy-customers.json")
};
