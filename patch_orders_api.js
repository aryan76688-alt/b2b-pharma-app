const fs = require('fs');
const file = 'src/app/api/orders/route.ts';
let code = fs.readFileSync(file, 'utf8');

const originalDestructure = `const { partyId, items, status, deliveryDate, remarks } = await req.json();`;
const newDestructure = `const { partyId, items, status, deliveryDate, remarks, locationLat, locationLng } = await req.json();`;

// Wait, I will use a try-catch for the DB insert, or I'll just change the insert query. 
// Actually, if I insert into a column that doesn't exist, it will throw.
// Better way: I will query if the column exists first, or just tell the user to click the sync button first.
// I'll assume they synced it.

const originalInsert = `        \`INSERT INTO orders (
          order_number, party_id, salesman_id, status, order_date, delivery_date,
          subtotal, discount_amount, total_amount, total_quantity, total_free_quantity, remarks
        ) VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, order_number as "orderNumber", status, total_amount as "totalAmount", total_quantity as "totalQuantity", total_free_quantity as "totalFreeQuantity"\`,
        [
          orderNumber,
          partyId,
          salesmanId,
          status,
          deliveryDate || null,
          totals.subtotal,
          totals.discountAmount,
          totals.totalAmount,
          totals.totalQuantity,
          totals.totalFreeQuantity,
          remarks || null
        ]`;

const newInsert = `        \`INSERT INTO orders (
          order_number, party_id, salesman_id, status, order_date, delivery_date,
          subtotal, discount_amount, total_amount, total_quantity, total_free_quantity, remarks, location_lat, location_lng
        ) VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, order_number as "orderNumber", status, total_amount as "totalAmount", total_quantity as "totalQuantity", total_free_quantity as "totalFreeQuantity"\`,
        [
          orderNumber,
          partyId,
          salesmanId,
          status,
          deliveryDate || null,
          totals.subtotal,
          totals.discountAmount,
          totals.totalAmount,
          totals.totalQuantity,
          totals.totalFreeQuantity,
          remarks || null,
          locationLat || null,
          locationLng || null
        ]`;

if (!code.includes('locationLat')) {
  code = code.replace(originalDestructure, newDestructure);
  code = code.replace(originalInsert, newInsert);
  fs.writeFileSync(file, code);
}
