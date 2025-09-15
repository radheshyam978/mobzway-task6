// src/App.js
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My To-Do App</h1>
          <div>
            <span className="mr-4 text-sm text-gray-700">{user.email}</span>
            <button
              className="px-3 py-1 bg-red-500 text-white rounded"
              onClick={() => signOut(auth)}
            >
              Sign out
            </button>
          </div>
        </header>

        <Dashboard user={user} />
      </div>
    </div>
  );
}
