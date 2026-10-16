'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  KeyRound,
  Trash2,
  Edit2,
  RefreshCw,
  Crown,
  Briefcase,
  Store,
} from 'lucide-react';

interface UserItem {
  id: string;
  role: 'super_admin' | 'owner' | 'admin' | 'salesman' | 'chemist';
  fullName: string;
  mobile: string;
  email: string;
  username: string;
  employeeCode?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [activeRole, setActiveRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    role: 'salesman',
    employeeCode: '',
    status: 'active',
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    role: 'salesman',
    status: 'active',
    employeeCode: '',
    newPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/owner/users', window.location.origin);
      if (activeRole !== 'all') url.searchParams.set('role', activeRole);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUsers(json.data.users || []);
          setRoleCounts(json.data.roleCounts || {});
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeRole, search]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username || !formData.mobile || !formData.password || !formData.email) {
      setErrorMsg('All fields marked with * are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/owner/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create user');
      }

      setIsCreateOpen(false);
      setFormData({
        fullName: '',
        username: '',
        mobile: '',
        email: '',
        password: '',
        role: 'salesman',
        employeeCode: '',
        status: 'active',
      });
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        fullName: editFormData.fullName,
        mobile: editFormData.mobile,
        email: editFormData.email,
        role: editFormData.role,
        status: editFormData.status,
        employeeCode: editFormData.employeeCode,
      };
      if (editFormData.newPassword.trim()) {
        payload.password = editFormData.newPassword.trim();
      }

      const res = await fetch(`/api/owner/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update user');
      }

      setIsEditOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to permanently delete user '${user.fullName}' (${user.username})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/owner/users/${user.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error?.message || 'Failed to delete user');
        return;
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      status: user.status,
      employeeCode: user.employeeCode || '',
      newPassword: '',
    });
    setErrorMsg(null);
    setIsEditOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <Crown className="w-3.5 h-3.5 text-purple-500" /> Super Admin
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Admin
          </span>
        );
      case 'salesman':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Salesman
          </span>
        );
      case 'chemist':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <Store className="w-3.5 h-3.5 text-indigo-500" /> Chemist
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <AppShell title="User Management">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              User Access & Roles
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage all roles: Super Admins, Owners, Admins, Salesmen, and Chemist accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="flex items-center gap-1.5 border-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setErrorMsg(null);
                setIsCreateOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-4 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{roleCounts.total || users.length}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-purple-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-purple-700 uppercase">Super Admins</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{roleCounts.super_admin || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-blue-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-blue-700 uppercase">Admins / Owners</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {(roleCounts.admin || 0) + (roleCounts.owner || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-emerald-700 uppercase">Salesmen</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{roleCounts.salesman || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-indigo-50/50">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-indigo-700 uppercase">Chemists</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{roleCounts.chemist || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {['all', 'super_admin', 'owner', 'admin', 'salesman', 'chemist'].map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeRole === role
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-72">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, username, mobile..."
            />
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No users found matching your current filters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card
                key={user.id}
                className="border-slate-200/90 shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden"
              >
                <div
                  className={`h-1.5 w-full ${
                    user.role === 'super_admin'
                      ? 'bg-purple-600'
                      : user.role === 'owner'
                      ? 'bg-amber-500'
                      : user.role === 'admin'
                      ? 'bg-blue-600'
                      : user.role === 'salesman'
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600'
                  }`}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base leading-snug">{user.fullName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">@{user.username}</p>
                    </div>
                    {getRoleBadge(user.role)}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{user.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.employeeCode && (
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Code: {user.employeeCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {user.status.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create User Modal */}
        <Dialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New User Account"
          description="Assign role and initial credentials for the user."
          maxWidth="lg"
        >
          {errorMsg && (
            <div className="mb-3 p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="ramesh_sales"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="salesman">Salesman</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="chemist">Chemist / Retailer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@shreejiapp.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Employee Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SH101"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit User: ${selectedUser?.fullName || ''}`}
          description="Update roles, status, or reset user password."
          maxWidth="lg"
        >
          {errorMsg && (
            <div className="mb-3 p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="salesman">Salesman</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="chemist">Chemist / Retailer</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Reset Password (Leave blank to keep unchanged)
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={editFormData.newPassword}
                onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </AppShell>
  );
}
