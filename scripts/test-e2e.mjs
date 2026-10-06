// Comprehensive End-to-End Test Suite for Shreeji Healthcare Order Book
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: res.status, headers: res.headers, data: json };
}

function extractCookie(headers) {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/shreeji_session=([^;]+)/);
  return match ? `shreeji_session=${match[1]}` : null;
}

async function runTests() {
  console.log('🧪 Starting Shreeji Healthcare E2E Verification Tests...\n');

  // Test 1: Health / App Root
  console.log('Test 1: App Root is reachable...');
  const rootRes = await request('/');
  assert.strictEqual(rootRes.status, 200, 'Root should return 200');
  console.log('✅ App root responds with 200 OK\n');

  // Test 2: Owner Login with Password
  console.log('Test 2: Owner Login with credentials (owner / Password123!)...');
  const ownerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'owner', password: 'Password123!' }),
  });
  assert.strictEqual(ownerLogin.status, 200, 'Owner login should return 200');
  assert.strictEqual(ownerLogin.data.success, true);
  assert.strictEqual(ownerLogin.data.data.user.role, 'owner');
  const ownerCookie = extractCookie(ownerLogin.headers);
  assert.ok(ownerCookie, 'Owner should receive session cookie');
  console.log('✅ Owner logged in successfully. Role:', ownerLogin.data.data.user.role, '\n');

  // Test 3: Owner Dashboard Metrics
  console.log('Test 3: Owner Dashboard API Metrics...');
  const ownerDash = await request('/api/owner/dashboard', {
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(ownerDash.status, 200);
  assert.strictEqual(ownerDash.data.success, true);
  console.log('✅ Owner Dashboard metrics loaded: Total Orders:', ownerDash.data.data.summary.totalOrders, 'Sales:', ownerDash.data.data.summary.totalSales, '\n');

  // Test 4: Salesman Password Login (ramesh / Password123!)
  console.log('Test 4: Salesman Password Login (ramesh / Password123!)...');
  const salesmanLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'ramesh', password: 'Password123!' }),
  });
  assert.strictEqual(salesmanLogin.status, 200, 'Salesman login should return 200');
  assert.strictEqual(salesmanLogin.data.success, true);
  assert.strictEqual(salesmanLogin.data.data.user.role, 'salesman');
  const salesmanCookie = extractCookie(salesmanLogin.headers);
  assert.ok(salesmanCookie, 'Salesman should receive session cookie');
  console.log('✅ Salesman ramesh logged in successfully. Role:', salesmanLogin.data.data.user.role, '\n');

  // Test 5: First-time Salesman Login (suresh - no MPIN yet)
  console.log('Test 5: First-time Salesman Login without MPIN (suresh)...');
  const sureshLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'suresh', password: 'Password123!' }),
  });
  assert.strictEqual(sureshLogin.status, 200);
  assert.strictEqual(sureshLogin.data.data.requiresMpinSetup, false, 'MPIN setup is now removed');
  console.log('✅ Suresh logged in without MPIN setup:', !sureshLogin.data.data.requiresMpinSetup, '\n');

  // Test 6: Salesman Security Isolation - Prohibited Routes
  console.log('Test 6: Security Isolation - Salesman forbidden from Excel Import Center...');
  const forbiddenImport = await request('/api/import/stock', {
    method: 'POST',
    headers: { Cookie: salesmanCookie },
    body: JSON.stringify({ rows: [] }),
  });
  assert.strictEqual(forbiddenImport.status, 403, 'Salesman MUST be rejected with 403 Forbidden');
  console.log('✅ Salesman blocked with 403 Forbidden from Excel Import API\n');

  // Test 7: Salesman Personal Reports Isolation
  console.log('Test 7: Salesman Personal Reports Isolation...');
  const salesmanReport = await request('/api/reports', {
    headers: { Cookie: salesmanCookie },
  });
  assert.strictEqual(salesmanReport.status, 200);
  assert.strictEqual(salesmanReport.data.data.role, 'salesman');
  assert.ok(salesmanReport.data.data.summary, 'Should return salesman summary only');
  console.log('✅ Salesman personal report isolated. Target:', salesmanReport.data.data.summary.targetAmount, '\n');

  // Test 8: Get Parties and Stock for Order Booking
  console.log('Test 8: Fetch Stock and Parties for Order Placement...');
  const partiesRes = await request('/api/parties', {
    headers: { Cookie: salesmanCookie },
  });
  assert.strictEqual(partiesRes.status, 200);
  const parties = partiesRes.data.data;
  assert.ok(parties.length > 0, 'Should have parties');
  const testParty = parties[0];

  const stockRes = await request('/api/stock', {
    headers: { Cookie: salesmanCookie },
  });
  assert.strictEqual(stockRes.status, 200);
  const products = stockRes.data.data;
  assert.ok(products.length > 0, 'Should have products');
  const testProduct = products.find((p) => p.batches && p.batches.length > 0);
  assert.ok(testProduct, 'Should have a product with batches');
  const testBatch = testProduct.batches[0];
  console.log(`✅ Selected Party: "${testParty.partyName}", Selected Batch: "${testProduct.productName}" (Batch: ${testBatch.batchNo}, PTR: ₹${testBatch.ptr})\n`);

  // Test 9: Create Order with STRICT FREE QUANTITY INVARIANT
  console.log('Test 9: Order Booking with Free Quantity Invariant Test...');
  console.log('Booking: 10 Billed Units + 2 Free Bonus Units...');
  const saleQty = 10;
  const freeQty = 2;
  const ptr = Number(testBatch.ptr);
  const expectedLineTotal = Number((saleQty * ptr).toFixed(2));
  const expectedGrandTotal = expectedLineTotal;

  const orderPayload = {
    partyId: testParty.id,
    paymentTerms: 'Credit 30 Days',
    remarks: 'E2E Test Order - Free Qty Invariant Verification',
    items: [
      {
        productId: testBatch.productId,
        batchId: testBatch.id,
        quantity: saleQty,
        freeQuantity: freeQty, // 2 free units
        ptr: ptr,
        mrp: Number(testBatch.mrp),
        discountPercent: 0,
      },
    ],
  };

  const createOrderRes = await request('/api/orders', {
    method: 'POST',
    headers: { Cookie: salesmanCookie },
    body: JSON.stringify(orderPayload),
  });

  assert.strictEqual(createOrderRes.status, 201, 'Order should be created with 201');
  const newOrder = createOrderRes.data.data;
  console.log(`Created Order #${newOrder.orderNumber}:`);
  console.log(` - Total Quantity (Billed): ${newOrder.totalQuantity}`);
  console.log(` - Total Free Quantity (Bonus): ${newOrder.totalFreeQuantity}`);
  console.log(` - Total Amount: ₹${newOrder.totalAmount}`);

  assert.strictEqual(Number(newOrder.totalQuantity), saleQty, 'Billed quantity must equal saleQty (10)');
  assert.strictEqual(Number(newOrder.totalFreeQuantity), freeQty, 'Free quantity must equal freeQty (2)');
  assert.strictEqual(Number(newOrder.totalAmount), expectedGrandTotal, `Grand total must strictly be ₹${expectedGrandTotal} (free units are ₹0.00)`);
  console.log('✅ FREE QUANTITY INVARIANT CONFIRMED: 2 free units added ₹0.00 to order total!\n');

  // Test 10: Owner Order Approval Workflow
  console.log(`Test 10: Owner Order Approval Workflow for Order #${newOrder.orderNumber}...`);
  const approveRes = await request(`/api/orders/${newOrder.id}/approve`, {
    method: 'POST',
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(approveRes.status, 200, 'Approval should succeed');
  assert.strictEqual(approveRes.data.success, true);
  console.log('✅ Order approved by Owner. Status changed to "approved".\n');

  // Test 11: Excel Sample Download Generation
  console.log('Test 11: Excel Sample Spreadsheet Generation (/api/import/sample/stock)...');
  const sampleRes = await fetch(`${BASE_URL}/api/import/sample/stock`, {
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(sampleRes.status, 200);
  const sampleContentType = sampleRes.headers.get('content-type');
  assert.ok(sampleContentType.includes('spreadsheetml'), 'Should return Excel spreadsheet mime type');
  const sampleBuffer = await sampleRes.arrayBuffer();
  assert.ok(sampleBuffer.byteLength > 1000, 'Excel template buffer should be > 1KB');
  console.log(`✅ Excel Sample template generated successfully (${sampleBuffer.byteLength} bytes)\n`);

  console.log('=====================================================');
  console.log('🎉 ALL 11 END-TO-END VERIFICATION TESTS PASSED 100%!');
  console.log('=====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
