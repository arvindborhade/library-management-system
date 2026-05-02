"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/services/api";
import type { DashboardSummary, Borrowing } from "@/types";

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${color} shadow-sm p-6`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.summary(), dashboardApi.recentActivities()])
      .then(([s, a]) => {
        setSummary(s.data);
        setActivities(a.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <SummaryCard label="Total Books" value={summary.total_books} color="border-blue-500" />
          <SummaryCard label="Total Members" value={summary.total_members} color="border-green-500" />
          <SummaryCard label="Active Borrowings" value={summary.active_borrowings} color="border-yellow-500" />
          <SummaryCard label="Overdue Books" value={summary.overdue_borrowings} color="border-red-500" />
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Recent Activities</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {activities.length === 0 && (
            <p className="p-4 text-gray-400 text-sm">No recent activity.</p>
          )}
          {activities.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {a.book?.title ?? a.book_id}
                </p>
                <p className="text-xs text-gray-500">
                  {a.member?.name ?? a.member_id} · {new Date(a.borrowed_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  a.status === "RETURNED"
                    ? "bg-green-100 text-green-700"
                    : a.overdue_days > 0
                      ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {a.status === "BORROWED" && a.overdue_days > 0 ? "OVERDUE" : a.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
