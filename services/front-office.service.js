export const frontOfficeSchema = {
  tables: {
    walk_ins: ["id", "guest", "phone", "email", "country", "service_category", "service_type", "healer", "visit_date", "visit_time", "guests", "source", "priority", "status", "payment_status", "amount", "assigned_room", "notes"],
    guest_followups: ["id", "walk_in_id", "type", "message", "due_at", "status"],
    room_assignments: ["id", "walk_in_id", "room_name", "assigned_at", "released_at"]
  }
};

export function summarizeWalkIns(walkIns) {
  return walkIns.reduce((summary, guest) => {
    summary.total += 1;
    summary.statuses[guest.status] = (summary.statuses[guest.status] || 0) + 1;
    summary.payments[guest.paymentStatus] = (summary.payments[guest.paymentStatus] || 0) + 1;
    return summary;
  }, { total: 0, statuses: {}, payments: {} });
}
