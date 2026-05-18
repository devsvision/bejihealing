export const posSchema = {
  tables: {
    products: ["id", "sku", "name", "category", "price", "stock", "is_active"],
    sales: ["id", "cashier_id", "payment_method", "subtotal", "tax", "total", "created_at"],
    sale_items: ["id", "sale_id", "product_id", "quantity", "unit_price"]
  }
};

export function calculateCart(cart) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.11);
  return { subtotal, tax, total: subtotal + tax };
}
