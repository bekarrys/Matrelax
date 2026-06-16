// Чистый маппинг корзины витрины → позиции заказа adminOrders.
// Без зависимостей от React — тестируется node:test.

export function cartToOrderItems(items = []) {
  return items.map((i) => ({
    name: i.name,
    modelId: i.productId,
    size: i.size,
    extra10cm: i.extra10cm ?? false,
    quantity: i.quantity ?? 1,
    price: i.price ?? 0,
    surcharge: 0,
  }));
}

export function cartTotal(items = []) {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}
