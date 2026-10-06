with open("src/app/api/owner/dashboard/route.ts", "r") as f:
    content = f.read()

import re

# Replace Top Selling Products block
old_top_products = """    // 4. Top Selling Products
    const topProductsRes = await query(`
      SELECT 
        p.id,
        p.product_name as name,
        p.packing,
        COALESCE(SUM(oi.quantity), 0) as "totalBilledQty",
        COALESCE(SUM(oi.free_quantity), 0) as "totalFreeQty",
        COALESCE(SUM(oi.line_total), 0) as "totalRevenue"
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled' AND o.status != 'rejected'
      GROUP BY p.id, p.product_name, p.packing
      ORDER BY "totalRevenue" DESC
      LIMIT 5
    `);"""

new_near_expiry = """    // 4. Near Expiry Products (Replaces Top Products)
    const nearExpiryListRes = await query(`
      SELECT 
        p.id as "productId",
        p.product_name as name,
        p.packing,
        b.batch_no as "batchNo",
        b.expiry_date as "expiryDate",
        b.stock_qty as "stockQty",
        b.ptr,
        EXTRACT(DAY FROM (b.expiry_date::timestamp - CURRENT_DATE::timestamp)) as "daysToExpiry"
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.expiry_date IS NOT NULL 
        AND b.stock_qty > 0 
        AND b.expiry_date >= CURRENT_DATE 
        AND b.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY b.expiry_date ASC
      LIMIT 6
    `, [thresholdDays]);"""

# Wait, the thresholdDays is declared further below in the file! I need to move thresholdDays declaration up.
content = content.replace("const settingsRes = await query(`SELECT value FROM app_settings WHERE key = 'near_expiry_threshold'`);", "")
content = content.replace("const thresholdDays = settingsRes.rows.length > 0 ? parseInt(settingsRes.rows[0].value.replace(/['\"]/g, '')) || 90 : 90;", "")

threshold_code = """
    const settingsRes = await query(`SELECT value FROM app_settings WHERE key = 'near_expiry_threshold'`);
    const thresholdDays = settingsRes.rows.length > 0 ? parseInt(settingsRes.rows[0].value.replace(/['"]/g, '')) || 90 : 90;
"""

content = content.replace(old_top_products, threshold_code + new_near_expiry)
content = content.replace("topProducts: topProductsRes.rows,", "nearExpiryProducts: nearExpiryListRes.rows,")

with open("src/app/api/owner/dashboard/route.ts", "w") as f:
    f.write(content)
