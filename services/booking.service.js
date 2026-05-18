export const bookingSchema = {
  table: "bookings",
  columns: ["id", "guest_id", "program_id", "start_date", "guest_count", "status", "total_amount", "payment_provider", "created_at"]
};

export async function createBooking(payload) {
  return {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...payload
  };
}
