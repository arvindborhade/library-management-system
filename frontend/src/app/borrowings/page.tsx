"use client";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import { borrowingsApi, booksApi, membersApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
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
  const [pageError, setPageError] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [formOptionsLoading, setFormOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [returnTarget, setReturnTarget] = useState<Borrowing | null>(null);
  const [returning, setReturning] = useState(false);

  const load = async () => {
    setListLoading(true);
    setPageError("");
    try {
      const res = await borrowingsApi.list(page, 10, statusFilter || undefined, searchQuery || undefined);
      setData(res.data);
    } catch (e) {
      setPageError(getErrorMessage(e, "Could not load borrowings"));
    } finally {
      setListLoading(false);
    }
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
    setPageError("");
    setFormOptionsLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([booksApi.list(1, 100), membersApi.list(1, 100)]);
      setBooks(bRes.data.items);
      setMembers(mRes.data.items);
      setShowBorrowForm(true);
    } catch (e) {
      setPageError(getErrorMessage(e, "Could not load books and members for borrowing"));
    } finally {
      setFormOptionsLoading(false);
    }
    setForm({ book_id: "", member_id: "", due_date: "" });
    setError("");
  };

  const handleBorrow = async () => {
    if (loading) return;
    setError("");
    if (!form.book_id) {
      setError("Select a book");
      return;
    }
    if (!form.member_id) {
      setError("Select a member");
      return;
    }
    if (!form.due_date) {
      setError("Due date is required");
      return;
    }
    const dueDate = new Date(form.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      setError("Enter a valid due date");
      return;
    }
    setLoading(true);
    try {
      await borrowingsApi.borrow({ ...form, due_date: dueDate.toISOString() });
      setShowBorrowForm(false);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const confirmReturn = async () => {
    if (!returnTarget || returning) return;
    setReturning(true);
    setPageError("");
    try {
      await borrowingsApi.return(returnTarget.id);
      setReturnTarget(null);
      await load();
    } catch (e) {
      setPageError(getErrorMessage(e, "Return failed"));
    } finally {
      setReturning(false);
    }
  };

  const borrowings = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Borrowings</h2>
        <button disabled={formOptionsLoading || loading || returning} onClick={openBorrowForm} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {formOptionsLoading ? "Loading..." : "+ Borrow Book"}
        </button>
      </div>
      <Alert message={pageError} onDismiss={() => setPageError("")} />

      <div className="flex gap-2 mb-4">
        <input
          className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Search by book, member, ISBN, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button disabled={listLoading} onClick={handleSearch} className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
          {listLoading ? "Searching..." : "Search"}
        </button>
        {searchQuery && (
          <button disabled={listLoading} onClick={clearSearch} className="text-sm text-blue-600 px-2 disabled:opacity-50">
            Clear
          </button>
        )}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          disabled={listLoading}
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
            {listLoading && (
              <tr><td colSpan={8}><LoadingState label="Loading borrowings..." /></td></tr>
            )}
            {!listLoading && borrowings.map((b) => (
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
                      onClick={() => setReturnTarget(b)}
                      disabled={returning || loading}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Return Book
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!listLoading && borrowings.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No borrowings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <button disabled={listLoading || page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="px-2 py-1">Page {page}</span>
            <button disabled={listLoading || page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <Modal open={showBorrowForm} title="Borrow a Book" onClose={loading ? undefined : () => setShowBorrowForm(false)}>
            <Alert message={error} onDismiss={() => setError("")} />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Book <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.book_id}
                  onChange={(e) => setForm((p) => ({ ...p, book_id: e.target.value }))}
                >
                  <option value="">Select a book</option>
                  {books.filter((b) => b.available_copies > 0).map((b) => (
                    <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>
                  ))}
                </select>
                {books.filter((b) => b.available_copies > 0).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No books currently available for borrowing</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Member <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.member_id}
                  onChange={(e) => setForm((p) => ({ ...p, member_id: e.target.value }))}
                >
                  <option value="">Select a member</option>
                  {members.filter((m) => m.is_active).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {members.filter((m) => m.is_active).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No active members found</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Date by which the book must be returned</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button disabled={loading} onClick={() => setShowBorrowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleBorrow} disabled={loading || !form.book_id || !form.member_id || !form.due_date}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Borrowing..." : "Borrow"}
              </button>
            </div>
      </Modal>

      <ConfirmDialog
        open={!!returnTarget}
        title="Return book"
        description={`Mark ${returnTarget?.book?.title ?? "this book"} as returned?`}
        confirmLabel="Return"
        loading={returning}
        onCancel={() => setReturnTarget(null)}
        onConfirm={confirmReturn}
      />
    </div>
  );
}
