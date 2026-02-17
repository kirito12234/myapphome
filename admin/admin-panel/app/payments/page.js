"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import PaymentTable from "@/components/PaymentTable";
import api from "@/services/api";

export default function PaymentsPage() {
  const toAbsoluteUrl = (value) => {
    if (!value) return "";
    if (String(value).startsWith("http")) return value;
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
    return `${base}${value}`;
  };
  const [payments, setPayments] = useState([]);
  const [payoutSettings, setPayoutSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError("");
      try {
        const [paymentsRes, payoutRes] = await Promise.all([
          api.get("/admin/payments"),
          api.get("/admin/payout-settings").catch(() => ({ data: { data: [] } })),
        ]);
        setPayments(paymentsRes.data.data || []);
        setPayoutSettings(payoutRes.data.data || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to fetch payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <Sidebar />
        <main className="ml-64 p-6">
          <Navbar title="Manage Payments" />
          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading ? (
            <div className="card">
              <p className="text-sm text-slate-500">Loading payments...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <PaymentTable payments={payments} />
              <div className="card overflow-x-auto">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Tutor Payout Methods</h2>
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3">Tutor</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">QR</th>
                      <th className="pb-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutSettings.map((item) => (
                      <tr key={item._id} className="border-b border-slate-100">
                        <td className="py-3 text-slate-700">{item.tutor?.name || "Tutor"}</td>
                        <td className="py-3 text-slate-700">{item.method}</td>
                        <td className="py-3 text-slate-700">{item.details?.name || "-"}</td>
                        <td className="py-3 text-slate-700">
                          {item.details?.qrImageUrl ? (
                            <a
                              className="text-brand-600 underline"
                              href={toAbsoluteUrl(item.details.qrImageUrl)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              View QR
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 text-slate-700">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!payoutSettings.length && <p className="pt-2 text-sm text-slate-500">No payout settings found.</p>}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

