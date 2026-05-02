"use client";
import { useEffect, useState } from "react";
import { membersApi } from "@/services/api";
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
  const [searchResults, setSearchResults] = useState<Member[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [history, setHistory] = useState<Borrowing[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await membersApi.list(page);
    setData(res.data);
    setSearchResults(null);
    setSearch("");
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = async () => {
    if (!search.trim()) return load();
    const res = await membersApi.search(search);
    setSearchResults(res.data);
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
    } catch (e: any) {
      setHistoryError(e.response?.data?.detail ?? "Could not load borrowing history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, string | boolean | undefined> = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      };
      if (editing) payload.is_active = form.is_active;
      if (editing) await membersApi.update(editing.id, payload);
      else await membersApi.create(payload);
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    await membersApi.delete(id);
    load();
  };

  const handleToggleActive = async (member: Member) => {
    const nextStatus = !member.is_active;
    try {
      await membersApi.update(member.id, { is_active: nextStatus });
      await load();
      if (viewing?.id === member.id) setViewing({ ...member, is_active: nextStatus });
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Status update failed");
    }
  };

  const members = searchResults ?? data?.items ?? [];
  const activeBorrowings = history.filter((b) => b.status === "BORROWED");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Members</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Member
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Search</button>
        {searchResults && <button onClick={load} className="text-sm text-blue-600 px-2">Clear</button>}
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
            {members.map((m) => (
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
                  <button onClick={() => openView(m)} className="text-gray-600 hover:underline text-xs">View</button>
                  <button onClick={() => openEdit(m)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleToggleActive(m)} className="text-amber-600 hover:underline text-xs">
                    {m.is_active ? "Set Inactive" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!searchResults && data && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="px-2 py-1">Page {page}</span>
            <button disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit Member" : "Add Member"}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              {TEXT_FIELDS.map((f) => (
                <input
                  key={f}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  value={form[f]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))}
                />
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
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl">
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
              <button onClick={() => handleToggleActive(viewing)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                {viewing.is_active ? "Set Inactive" : "Activate"}
              </button>
              <button onClick={() => { setViewing(null); openEdit(viewing); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Edit
              </button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
