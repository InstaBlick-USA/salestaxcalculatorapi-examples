# Postman collection

Explore calculations, transactions, adjustments, batches, and coverage without writing a client first.

## Import and run

1. Import [`Sales-Tax-Calculator-API.postman_collection.json`](./Sales-Tax-Calculator-API.postman_collection.json).
2. Import [`Local.postman_environment.json`](./Local.postman_environment.json).
3. Select **Sales Tax Calculator API · Local** as the active environment.
4. Set `apiKey` to a server-side `stca_` key in the environment's **Current value** field.
5. Start with **Create calculation** and run requests in collection order.

The collection stores returned calculation, line, transaction, adjustment, and batch IDs as collection variables. Create requests generate a fresh idempotency key automatically.

> [!CAUTION]
> Do not export or commit a Postman environment after adding credentials. The checked-in environment contains placeholders only.

The adjustment example reverses `10.00` from the first calculation line. Change that amount when your calculation is smaller or when you need a quantity-based adjustment.

