-- SHREEJI HEALTHCARE — “A Unit of Shreeji 7”
-- Migration Seed: 001_seed_data.sql
-- Password for all demo accounts: Password123!
-- MPIN for Ramesh Kumar: 1234 (created for testing subsequent login)

-- Clear existing data
TRUNCATE TABLE audit_logs, notifications, import_errors, outstanding_imports, party_imports, stock_imports, 
               party_outstanding_snapshots, party_transactions, order_status_history, order_items, orders, 
               schemes, product_batches, products, parties, salesman_profiles, user_security, users CASCADE;

-- 1. INSERT OWNER
INSERT INTO users (id, role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'owner', 'Owner Admin', '9876543210', 'owner@shreejihealthcare.in', 'owner', 'OWN-001', 'active', false, true);

INSERT INTO user_security (user_id, password_hash, mpin_hash, mpin_salt)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', '$2a$10$xVF.AE0f3ZSJNSlM/rQBH.qIY2lnQgWaHBz0h.236CKT6SOwG.nxO', 'e97fbabf97243a1f950eeebb6a127a7e089bc895b12ce89fbfd141e51ae81aaa', '2e2dbf84206f07ac917eefe355158c3b');

-- 2. INSERT SALESMEN
-- Ramesh Kumar (first_login=false, mpin_created=true with MPIN 1234 for subsequent login testing)
INSERT INTO users (id, role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
VALUES 
  ('b2222222-2222-2222-2222-222222222222', 'salesman', 'Ramesh Kumar', '9876543211', 'ramesh@shreejihealthcare.in', 'ramesh', 'SH001', 'active', false, true);

INSERT INTO user_security (user_id, password_hash, mpin_hash, mpin_salt)
VALUES 
  ('b2222222-2222-2222-2222-222222222222', '$2a$10$xVF.AE0f3ZSJNSlM/rQBH.qIY2lnQgWaHBz0h.236CKT6SOwG.nxO', 'e97fbabf97243a1f950eeebb6a127a7e089bc895b12ce89fbfd141e51ae81aaa', '2e2dbf84206f07ac917eefe355158c3b');

INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount)
VALUES 
  ('b2222222-2222-2222-2222-222222222222', 'SH001', 'Ahmedabad West', '2026-08-01', 150000.00);

-- Suresh Patel (first_login=true, mpin_created=false for testing first-time login -> MPIN creation)
INSERT INTO users (id, role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
VALUES 
  ('b3333333-3333-3333-3333-333333333333', 'salesman', 'Suresh Patel', '9876543212', 'suresh@shreejihealthcare.in', 'suresh', 'SH002', 'active', true, false);

INSERT INTO user_security (user_id, password_hash)
VALUES 
  ('b3333333-3333-3333-3333-333333333333', '$2a$10$xVF.AE0f3ZSJNSlM/rQBH.qIY2lnQgWaHBz0h.236CKT6SOwG.nxO');

INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount)
VALUES 
  ('b3333333-3333-3333-3333-333333333333', 'SH002', 'Ahmedabad East', '2026-08-15', 120000.00);

-- Amit Shah
INSERT INTO users (id, role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
VALUES 
  ('b4444444-4444-4444-4444-444444444444', 'salesman', 'Amit Shah', '9876543213', 'amit@shreejihealthcare.in', 'amit', 'SH003', 'active', false, true);

INSERT INTO user_security (user_id, password_hash, mpin_hash, mpin_salt)
VALUES 
  ('b4444444-4444-4444-4444-444444444444', '$2a$10$xVF.AE0f3ZSJNSlM/rQBH.qIY2lnQgWaHBz0h.236CKT6SOwG.nxO', 'e97fbabf97243a1f950eeebb6a127a7e089bc895b12ce89fbfd141e51ae81aaa', '2e2dbf84206f07ac917eefe355158c3b');

INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount)
VALUES 
  ('b4444444-4444-4444-4444-444444444444', 'SH003', 'Gandhinagar', '2026-09-01', 100000.00);

-- Vikash Chaudhary
INSERT INTO users (id, role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
VALUES 
  ('b5555555-5555-5555-5555-555555555555', 'salesman', 'Vikash Chaudhary', '9876543214', 'vikash@shreejihealthcare.in', 'vikash', 'SH004', 'active', false, true);

INSERT INTO user_security (user_id, password_hash, mpin_hash, mpin_salt)
VALUES 
  ('b5555555-5555-5555-5555-555555555555', '$2a$10$xVF.AE0f3ZSJNSlM/rQBH.qIY2lnQgWaHBz0h.236CKT6SOwG.nxO', 'ebc735acdb01f2d5980619183ebc5f7795dfb1db6e14468d56b9e361e57b074c', '2e2dbf84206f07ac917eefe355158c3b');

INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount)
VALUES 
  ('b5555555-5555-5555-5555-555555555555', 'SH004', 'Vadodara', '2026-09-10', 110000.00);

-- 3. INSERT PARTIES
INSERT INTO parties (id, party_code, party_name, mobile, email, gst_number, address, state, city, area, party_type, credit_limit, opening_balance, assigned_salesman_id, status)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', 'PRT-1001', 'Shiv Medical Store', '9825012345', 'shiv@gmail.com', '24AAAAA0000A1Z5', 'Shop 4, Crystal Plaza, Navrangpura', 'Gujarat', 'Ahmedabad', 'Navrangpura', 'chemist', 75000.00, 15000.00, 'b2222222-2222-2222-2222-222222222222', 'active'),
  ('c2222222-2222-2222-2222-222222222222', 'PRT-1002', 'Jain Pharma', '9825012346', 'jainpharma@gmail.com', '24BBBBB1111B2Z6', '12 Relief Road, Kalupur', 'Gujarat', 'Ahmedabad', 'Relief Road', 'chemist', 100000.00, 24500.00, 'b3333333-3333-3333-3333-333333333333', 'active'),
  ('c3333333-3333-3333-3333-333333333333', 'PRT-1003', 'Life Care Pharmacy', '9825012347', 'lifecare@gmail.com', '24CCCCC2222C3Z7', 'Opp Civil Hospital, Asarwa', 'Gujarat', 'Ahmedabad', 'Asarwa', 'chemist', 50000.00, 8900.00, 'b4444444-4444-4444-4444-444444444444', 'active'),
  ('c4444444-4444-4444-4444-444444444444', 'PRT-1004', 'Gupta Medical', '9825012348', 'guptamed@gmail.com', '24DDDDD3333D4Z8', 'Sector 21 Market', 'Gujarat', 'Gandhinagar', 'Sector 21', 'retailer', 60000.00, 11200.00, 'b5555555-5555-5555-5555-555555555555', 'active'),
  ('c5555555-5555-5555-5555-555555555555', 'PRT-1005', 'Patel Medical', '9825012349', 'patelmed@gmail.com', '24EEEEE4444E5Z9', 'Station Road, Maninagar', 'Gujarat', 'Ahmedabad', 'Maninagar', 'chemist', 80000.00, 18400.00, 'b2222222-2222-2222-2222-222222222222', 'active');

-- 4. INSERT PRODUCTS
INSERT INTO products (id, product_code, product_name, generic_name, company, category, packing, mrp, ptr, stock_qty, free_qty, default_scheme)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', 'PARA-650', 'Paracetamol 650', 'Paracetamol 650mg', 'Shreeji 7', 'Tablet', '10x10 Tablets', 23.00, 12.50, 450, 45, '10+2'),
  ('d2222222-2222-2222-2222-222222222222', 'AZI-500', 'Azithromycin 500', 'Azithromycin 500mg', 'Shreeji 7', 'Tablet', '3 Tablets', 120.00, 68.00, 220, 25, '5+1'),
  ('d3333333-3333-3333-3333-333333333333', 'PANTO-40', 'Pantoprazole 40', 'Pantoprazole 40mg', 'Shreeji 7', 'Capsule', '10x10 Capsules', 95.00, 59.00, 310, 30, '5+1'),
  ('d4444444-4444-4444-4444-444444444444', 'AMOX-500', 'Amoxicillin 500', 'Amoxicillin 500mg', 'Shreeji 7', 'Capsule', '10x10 Capsules', 110.00, 68.00, 180, 20, '10+2'),
  ('d5555555-5555-5555-5555-555555555555', 'CET-10', 'Cetirizine 10', 'Cetirizine 10mg', 'Shreeji 7', 'Tablet', '10x10 Tablets', 45.00, 28.00, 500, 50, '10+2');

-- 5. INSERT PRODUCT BATCHES
INSERT INTO product_batches (product_id, batch_no, expiry_date, mrp, ptr, stock_qty, free_qty)
VALUES 
  ('d1111111-1111-1111-1111-111111111111', 'BCH-PARA-2401', '2027-12-31', 23.00, 12.50, 450, 45),
  ('d2222222-2222-2222-2222-222222222222', 'BCH-AZI-2402', '2027-08-31', 120.00, 68.00, 220, 25),
  ('d3333333-3333-3333-3333-333333333333', 'BCH-PANTO-2403', '2027-06-30', 95.00, 59.00, 310, 30),
  ('d4444444-4444-4444-4444-444444444444', 'BCH-AMOX-2404', '2027-10-31', 110.00, 68.00, 180, 20),
  ('d5555555-5555-5555-5555-555555555555', 'BCH-CET-2405', '2028-02-28', 45.00, 28.00, 500, 50);

-- 6. INSERT SCHEMES
INSERT INTO schemes (id, scheme_name, description, scheme_type, buy_quantity, free_quantity, start_date, end_date, status)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', '10+2 Scheme', 'Buy 10 packs, get 2 packs bonus free', 'quantity_bonus', 10, 2, '2026-09-01', '2026-10-31', 'active'),
  ('e2222222-2222-2222-2222-222222222222', '5+1 Scheme', 'Buy 5 packs, get 1 pack bonus free', 'quantity_bonus', 5, 1, '2026-09-01', '2026-10-31', 'active');

-- 7. INSERT SAMPLE ORDERS (matching mockup values)
-- #ORD1257 (Approved)
INSERT INTO orders (id, order_number, party_id, salesman_id, status, order_date, subtotal, discount_amount, total_amount, total_quantity, total_free_quantity, remarks, approved_by, approved_at)
VALUES 
  ('f1111111-1111-1111-1111-111111111111', '#ORD1257', 'c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'approved', now() - INTERVAL '2 hours', 4280.00, 0.00, 4280.00, 52, 6, 'Regular monthly order', 'a1111111-1111-1111-1111-111111111111', now() - INTERVAL '1 hour');

INSERT INTO order_items (order_id, product_id, quantity, free_quantity, ptr, mrp, line_total, scheme_name)
VALUES 
  ('f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 20, 4, 12.50, 23.00, 250.00, '10+2'),
  ('f1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 32, 2, 68.00, 120.00, 2176.00, '5+1');

INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
VALUES 
  ('f1111111-1111-1111-1111-111111111111', NULL, 'pending', 'b2222222-2222-2222-2222-222222222222', 'Order submitted by salesman'),
  ('f1111111-1111-1111-1111-111111111111', 'pending', 'approved', 'a1111111-1111-1111-1111-111111111111', 'Approved by owner');

-- #ORD1258 (Pending)
INSERT INTO orders (id, order_number, party_id, salesman_id, status, order_date, subtotal, discount_amount, total_amount, total_quantity, total_free_quantity, remarks)
VALUES 
  ('f2222222-2222-2222-2222-222222222222', '#ORD1258', 'c1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'pending', now() - INTERVAL '30 minutes', 2450.00, 0.00, 2450.00, 30, 4, 'Awaiting owner approval');

INSERT INTO order_items (order_id, product_id, quantity, free_quantity, ptr, mrp, line_total, scheme_name)
VALUES 
  ('f2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333', 30, 4, 59.00, 95.00, 1770.00, '5+1');

INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
VALUES 
  ('f2222222-2222-2222-2222-222222222222', NULL, 'pending', 'b2222222-2222-2222-2222-222222222222', 'Order submitted by salesman');

-- 8. INSERT PARTY OUTSTANDING SNAPSHOTS
INSERT INTO party_outstanding_snapshots (party_id, snapshot_date, last_bill_date, last_payment_date, total_outstanding, total_received, pending_days, total_bills)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE, CURRENT_DATE - 16, CURRENT_DATE - 30, 42350.00, 35000.00, 16, 4),
  ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE, CURRENT_DATE - 23, CURRENT_DATE - 45, 68400.00, 50000.00, 23, 6),
  ('c3333333-3333-3333-3333-333333333333', CURRENT_DATE, CURRENT_DATE - 5, CURRENT_DATE - 15, 12500.00, 20000.00, 5, 2);

-- 9. INSERT PARTY TRANSACTIONS (Ledger)
INSERT INTO party_transactions (party_id, transaction_date, transaction_type, reference_type, reference_id, debit, credit, balance, remarks)
VALUES 
  ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE - 45, 'opening', 'Opening Balance', 'OP-2026', 15000.00, 0.00, 15000.00, 'Opening ledger balance'),
  ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE - 30, 'invoice', 'Order Invoice', 'INV-9021', 45000.00, 0.00, 60000.00, 'Invoice for medicine supply'),
  ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE - 16, 'payment', 'Bank Transfer', 'TXN-88192', 0.00, 35000.00, 25000.00, 'NEFT payment received'),
  ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE - 5, 'invoice', 'Order Invoice', 'INV-9154', 17350.00, 0.00, 42350.00, 'Invoice for repeat supply');
