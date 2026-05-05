"use client";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import { membersApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import type { Borrowing, Member, PaginatedResponse } from "@/types";

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
};

const EMPTY_FORM: MemberForm = { name: "", email: "", phone: "", address: "", is_active: true };
const TEXT_FIELDS = ["name", "email", "phone", "address"] as const;

export default function MembersPage() {
  const [data, setData] = useState<PaginatedResponse<Member> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PaginatedResponse<Member> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [history, setHistory] = useState<Borrowing[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [statusTarget, setStatusTarget] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setListLoading(true);
    setPageError("");
    try {
      const res = await membersApi.list(page);
      setData(res.data);
    } catch (e) {
      setPageError(getErrorMessage(e, "Could not load members"));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) load();
  }, [page, searchQuery]);

  const handleSearch = async () => {
    const query = search.trim();
    if (!query) {
      setSearchQuery("");
      setSearchResults(null);
      setPage(1);
      return load();
    }
    setPage(1);
    setSearchQuery(query);
    setListLoading(true);
    setPageError("");
    try {
      const res = await membersApi.search(query, 1);
      setSearchResults(res.data);
    } catch (e) {
      setPageError(getErrorMessage(e, "Search failed"));
    } finally {
      setListLoading(false);
    }
  };

  const refreshCurrentView = async () => {
    if (!searchQuery) {
      await load();
      return;
    }
    setListLoading(true);
    setPageError("");
    try {
      const res = await membersApi.search(searchQuery, page);
      setSearchResults(res.data);
    } catch (e) {
      setPageError(getErrorMessage(e, "Search failed"));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) return;
    const loadSearchPage = async () => {
      setListLoading(true);
      setPageError("");
      try {
        const res = await membersApi.search(searchQuery, page);
        setSearchResults(res.data);
      } catch (e) {
        setPageError(getErrorMessage(e, "Search failed"));
      } finally {
        setListLoading(false);
      }
    };
    loadSearchPage();
  }, [page, searchQuery]);

  const clearSearch = () => {
    setSearch("");
    setSearchQuery("");
    setSearchResults(null);
    setPage(1);
    load();
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      name: m.name,
      email: m.email ?? "",
      phone: m.phone ?? "",
      address: m.address ?? "",
      is_active: m.is_active,
    });
    setError("");
    setShowForm(true);
  };

  const openView = async (m: Member) => {
    setViewing(m);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const res = await membersApi.borrowingHistory(m.id);
      setHistory(res.data);
    } catch (e) {
      setHistoryError(getErrorMessage(e, "Could not load borrowing history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError("");
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string | boolean | undefined> = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      };
      if (editing) payload.is_active = form.is_active;
      if (editing) await membersApi.update(editing.id, payload);
      else await membersApi.create(payload);
      setShowForm(false);
      await refreshCurrentView();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || actionLoading) return;
    setActionLoading(true);
    setPageError("");
    try {
      await membersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await refreshCurrentView();
    } catch (e) {
      setPageError(getErrorMessage(e, "Delete failed"));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!statusTarget || actionLoading) return;
    const nextStatus = !statusTarget.is_active;
    setActionLoading(true);
    setPageError("");
    try {
      await membersApi.update(statusTarget.id, { is_active: nextStatus });
      await refreshCurrentView();
      if (viewing?.id === statusTarget.id) setViewing({ ...statusTarget, is_active: nextStatus });
      setStatusTarget(null);
    } catch (e) {
      setPageError(getErrorMessage(e, "Status update failed"));
    }
    setActionLoading(false);
  };

  const pageData = searchResults ?? data;
  const members = pageData?.items ?? [];
  const activeBorrowings = history.filter((b) => b.status === "BORROWED");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Members</h2>
        <button disabled={loading || actionLoading} onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          + Add Member
        </button>
      </div>
      <Alert message={pageError} onDismiss={() => setPageError("")} />

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button disabled={listLoading} onClick={handleSearch} className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">{listLoading ? "Searching..." : "Search"}</button>
        {searchResults && <button disabled={listLoading} onClick={clearSearch} className="text-sm text-blue-600 px-2 disabled:opacity-50">Clear</button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listLoading && (
              <tr><td colSpan={5}><LoadingState label="Loading members..." /></td></tr>
            )}
            {!listLoading && members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{m.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button disabled={actionLoading || loading} onClick={() => openView(m)} className="text-gray-600 hover:underline text-xs disabled:opacity-50">View</button>
                  <button disabled={actionLoading || loading} onClick={() => openEdit(m)} className="text-blue-600 hover:underline text-xs disabled:opacity-50">Edit</button>
                  <button disabled={actionLoading || loading} onClick={() => setStatusTarget(m)} className="text-amber-600 hover:underline text-xs disabled:opacity-50">
                    {m.is_active ? "Set Inactive" : "Activate"}
                  </button>
                  <button disabled={actionLoading || loading} onClick={() => setDeleteTarget(m)} className="text-red-500 hover:underline text-xs disabled:opacity-50">Delete</button>
                </td>
              </tr>
            ))}
            {!listLoading && members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pageData && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Total: {pageData.total}</span>
          <div className="flex gap-2">
            <button disabled={listLoading || page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="px-2 py-1">Page {page}</span>
            <button disabled={listLoading || page * pageData.page_size >= pageData.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <Modal open={showForm} title={editing ? "Edit Member" : "Add Member"} onClose={loading ? undefined : () => setShowForm(false)}>
            <Alert message={error} onDismiss={() => setError("")} />
            <div className="space-y-3">
              {TEXT_FIELDS.map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === "name" && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder={
                      f === "email" ? "e.g. john@example.com" :
                      f === "phone" ? "e.g. +91 9876543210" :
                      `Enter ${f}`
                    }
                    value={form[f]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))}
                  />
                  {f === "email" && <p className="text-xs text-gray-500 mt-1">Optional — used to check for duplicates</p>}
                </div>
              ))}
              {editing && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Active member
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button disabled={loading} onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} maxWidth="max-w-3xl">
        {viewing && (
          <>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewing.name}</h3>
                <p className="text-sm text-gray-500">{viewing.email ?? "No email"} · {viewing.phone ?? "No phone"}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${viewing.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {viewing.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
              <div>
                <p className="text-gray-500">Active Borrowings</p>
                <p className="font-semibold text-gray-900">{activeBorrowings.length}</p>
              </div>
              <div>
                <p className="text-gray-500">History Records</p>
                <p className="font-semibold text-gray-900">{history.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Address</p>
                <p className="font-semibold text-gray-900 truncate">{viewing.address ?? "—"}</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Book</th>
                    <th className="text-left px-3 py-2">Due</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLoading && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Loading history...</td></tr>
                  )}
                  {historyError && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-red-500">{historyError}</td></tr>
                  )}
                  {!historyLoading && !historyError && history.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No borrowing history.</td></tr>
                  )}
                  {!historyLoading && !historyError && history.map((b) => {
                    const overdue = b.status === "BORROWED" && b.overdue_days > 0;
                    return (
                      <tr key={b.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">{b.book?.title ?? b.book_id.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-gray-500">{new Date(b.due_date).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${overdue ? "bg-red-100 text-red-700" : b.status === "RETURNED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {overdue ? "OVERDUE" : b.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {parseFloat(b.current_fine_amount) > 0 ? `₹${b.current_fine_amount}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button disabled={actionLoading} onClick={() => setStatusTarget(viewing)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {viewing.is_active ? "Set Inactive" : "Activate"}
              </button>
              <button onClick={() => { setViewing(null); openEdit(viewing); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Edit
              </button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete member"
        description={`Delete ${deleteTarget?.name ?? "this member"}? This member will be marked inactive.`}
        confirmLabel="Delete"
        tone="danger"
        loading={actionLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.is_active ? "Set member inactive" : "Activate member"}
        description={`${statusTarget?.is_active ? "Set" : "Activate"} ${statusTarget?.name ?? "this member"}?`}
        confirmLabel={statusTarget?.is_active ? "Set Inactive" : "Activate"}
        loading={actionLoading}
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmToggleActive}
      />
    </div>
  );
}
