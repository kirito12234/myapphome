"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <Sidebar />
        <main className="ml-64 p-6">
          <Navbar title="Help" />

          <section className="card mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Need help?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use the support options below for account issues, payment questions, and admin access help.
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Email support:{" "}
              <a className="font-medium text-brand hover:underline" href="mailto:support@hometutor.com">
                support@hometutor.com
              </a>
            </p>
          </section>

          <section className="card">
            <h3 className="text-base font-semibold text-slate-900">Quick FAQs</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li>
                <strong>How do I update my admin name?</strong>
                <p>Go to Account &gt; Settings and save your new profile name.</p>
              </li>
              <li>
                <strong>Where can I see payments?</strong>
                <p>Open Account &gt; Payment to view the full payment table.</p>
              </li>
              <li>
                <strong>How do I sign out?</strong>
                <p>Use the Logout button in the left sidebar.</p>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
