"use client";
import { useEffect, useState } from "react";
import { borrowingsApi, booksApi, membersApi } from "@/services/api";
import type { Borrowing, Book, Member, PaginatedResponse } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  BORROWED: "bg-yellow-100 text-yellow-700",
  RETURNED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

function isOverdue(borrowing: Borrowing) {
  return borrowing.status === "BORROWED" && borrowing.overdue_days > 0;
}

function displayStatus(borrowing: Borrowing) {
  return isOverdue(borrowing) ? "OVERDUE" : borrowing.status;
}

export default function BorrowingsPage() {
  const [data, setData] = useState<PaginatedResponse<Borrowing> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ book_id: "", member_id: "", due_date: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await borrowingsApi.list(page, 10, statusFilter || undefined, searchQuery || undefined);
    setData(res.data);
  };

  useEffect(() => { load(); }, [page, statusFilter, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(search.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchQuery("");
    setPage(1);
  };

  const openBorrowForm = async () => {
    const [bRes, mRes] = await Promise.all([booksApi.list(1, 100), membersApi.list(1, 100)]);
    setBooks(bRes.data.items);
    setMembers(mRes.data.items);
    setForm({ book_id: "", member_id: "", due_date: "" });
    setError("");
    setShowBorrowForm(true);
  };

  const handleBorrow = async () => {
    setError("");
    setLoading(true);
    try {
      await borrowingsApi.borrow({ ...form, due_date: new Date(form.due_date).toISOString() });
      setShowBorrowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (id: string) => {
    if (!confirm("Mark this book as returned?")) return;
    try {
      await borrowingsApi.return(id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Return failed");
    }
  };

  const borrowings = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Borrowings</h2>
        <button onClick={openBorrowForm} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Borrow Book
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Search by book, member, ISBN, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
          Search
        </button>
        {searchQuery && (
          <button onClick={clearSearch} className="text-sm text-blue-600 px-2">
            Clear
          </button>
        )}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="BORROWED">Borrowed</option>
          <option value="RETURNED">Returned</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Book</th>
              <th className="text-left px-4 py-3">Member</th>
              <th className="text-left px-4 py-3">Borrowed</th>
              <th className="text-left px-4 py-3">Due Date</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Overdue</th>
              <th className="text-left px-4 py-3">Fine</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {borrowings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.book?.title ?? b.book_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-600">{b.member?.name ?? b.member_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(b.borrowed_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(b.due_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[displayStatus(b)] ?? ""}`}>{displayStatus(b)}</span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {b.overdue_days > 0 ? `${b.overdue_days} day${b.overdue_days === 1 ? "" : "s"}` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {parseFloat(b.current_fine_amount) > 0 ? `₹${b.current_fine_amount}` : "—"}
                </td>
                <td className="px-4 py-3">
                  {b.status === "BORROWED" && (
                    <button
                      onClick={() => handleReturn(b.id)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Return Book
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {borrowings.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No borrowings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="px-2 py-1">Page {page}</span>
            <button disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {showBorrowForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Borrow a Book</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.book_id}
                onChange={(e) => setForm((p) => ({ ...p, book_id: e.target.value }))}
              >
                <option value="">Select Book</option>
                {books.filter((b) => b.available_copies > 0).map((b) => (
                  <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>
                ))}
              </select>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.member_id}
                onChange={(e) => setForm((p) => ({ ...p, member_id: e.target.value }))}
              >
                <option value="">Select Member</option>
                {members.filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowBorrowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleBorrow} disabled={loading || !form.book_id || !form.member_id || !form.due_date}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Borrowing..." : "Borrow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
