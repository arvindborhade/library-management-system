"use client";
import { useEffect, useState } from "react";
import { booksApi } from "@/services/api";
import type { Book, PaginatedResponse } from "@/types";

type BookForm = {
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  available_copies: number;
};

const EMPTY_FORM: BookForm = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  total_copies: 1,
  available_copies: 1,
};

const TEXT_FIELDS = ["title", "author", "isbn", "category"] as const;

export default function BooksPage() {
  const [data, setData] = useState<PaginatedResponse<Book> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [viewing, setViewing] = useState<Book | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await booksApi.list(page);
    setData(res.data);
    setSearchResults(null);
    setSearch("");
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = async () => {
    if (!search.trim()) return load();
    const res = await booksApi.search(search);
    setSearchResults(res.data);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); };
  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({
      title: b.title,
      author: b.author,
      isbn: b.isbn ?? "",
      category: b.category ?? "",
      total_copies: b.total_copies,
      available_copies: b.available_copies,
    });
    setError("");
    setShowForm(true);
  };

  const handleTotalCopiesChange = (value: string) => {
    const total_copies = Math.max(0, Number(value));
    setForm((prev) => {
      const available_copies =
        prev.available_copies === prev.total_copies
          ? total_copies
          : Math.min(prev.available_copies, total_copies);
      return { ...prev, total_copies, available_copies };
    });
  };

  const handleAvailableCopiesChange = (value: string) => {
    const available_copies = Math.min(Math.max(0, Number(value)), form.total_copies);
    setForm((prev) => ({ ...prev, available_copies }));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        isbn: form.isbn || undefined,
        category: form.category || undefined,
      };
      if (editing) {
        await booksApi.update(editing.id, payload);
      } else {
        await booksApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    await booksApi.delete(id);
    load();
  };

  const books = searchResults ?? data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Books</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Book
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Search by title, author, ISBN, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
          Search
        </button>
        {searchResults && (
          <button onClick={load} className="text-sm text-blue-600 px-2">Clear</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Author</th>
              <th className="text-left px-4 py-3">ISBN</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Copies</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {books.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                <td className="px-4 py-3 text-gray-600">{b.author}</td>
                <td className="px-4 py-3 text-gray-500">{b.isbn ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{b.category ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${b.available_copies === 0 ? "text-red-600" : "text-green-600"}`}>
                    {b.available_copies}/{b.total_copies}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => setViewing(b)} className="text-gray-600 hover:underline text-xs">View</button>
                  <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No books found.</td></tr>
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
            <h3 className="text-lg font-semibold mb-4">{editing ? "Edit Book" : "Add Book"}</h3>
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
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Total Copies"
                value={form.total_copies}
                min={0}
                onChange={(e) => handleTotalCopiesChange(e.target.value)}
              />
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Available Copies"
                value={form.available_copies}
                min={0}
                max={form.total_copies}
                onChange={(e) => handleAvailableCopiesChange(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewing.title}</h3>
                <p className="text-sm text-gray-500">{viewing.author}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${viewing.available_copies === 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {viewing.available_copies} available
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">ISBN</dt>
                <dd className="font-medium text-gray-900">{viewing.isbn ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{viewing.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Copies</dt>
                <dd className="font-medium text-gray-900">{viewing.total_copies}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Available Copies</dt>
                <dd className="font-medium text-gray-900">{viewing.available_copies}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">{new Date(viewing.created_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Updated</dt>
                <dd className="font-medium text-gray-900">{new Date(viewing.updated_at).toLocaleDateString()}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2 mt-5">
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
