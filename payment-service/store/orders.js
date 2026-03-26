/**
 * In-Memory Order Store
 * Replace this Map with a real database (SQLite, Postgres, MongoDB) for production.
 */

const orders = new Map();

function createOrder(data) {
  orders.set(data.ref, { ...data, createdAt: new Date().toISOString() });
  console.log('[Store] Order created:', data.ref);
}

function getOrder(ref) {
  return orders.get(ref) || null;
}

function updateOrder(ref, updates) {
  const order = orders.get(ref);
  if (!order) {
    console.warn('[Store] Order not found:', ref);
    return;
  }
  orders.set(ref, { ...order, ...updates });
  console.log('[Store] Order updated:', ref, '→', updates.status);
}

function listOrders() {
  return Array.from(orders.values());
}

module.exports = { createOrder, getOrder, updateOrder, listOrders };
