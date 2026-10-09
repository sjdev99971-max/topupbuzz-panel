"use client";
import { useEffect, useState } from "react";
import { getHealth, getAccounts } from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getHealth()
      .then(d => setHealth(d))
      .catch(e => setError("Backend unreachable: " + e.message));
    getAccounts()
      .then(d => setAccounts(d))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TopUpBuzz Panel 🚀</h1>

        <div className="bg-gray-900 rounded-lg p-5 mb-4">
          <h2 className="text-lg font-semibold mb-2">Backend Status</h2>
          {error && <p className="text-red-400">{error}</p>}
          {health && (
            <pre className="text-green-400 text-xs">{JSON.stringify(health, null, 2)}</pre>
          )}
          {!health && !error && <p className="text-gray-400">Loading...</p>}
        </div>

        <div className="bg-gray-900 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2">
            Accounts ({accounts.length})
          </h2>
          {accounts.length === 0 ? (
            <p className="text-gray-400">No accounts yet</p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.id} className="border border-gray-700 rounded p-3">
                  <p className="font-mono text-sm">{a.phone}</p>
                  <p className="text-xs text-gray-400">{a.health}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
