-- Migration 004: Expand User Roles for Comprehensive User Management
-- Supports: super_admin, owner, admin, salesman, chemist

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'owner', 'admin', 'salesman', 'chemist'));
