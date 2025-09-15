import { useState } from "react";
import { auth, db } from "./firebase"; // 🔹 added db
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // 🔹 added Firestore imports

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const user = await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful ✅");
        console.log("Logged in:", user.user);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);

        // 🔹 Store user info in Firestore
        await setDoc(doc(db, "users", userCred.user.uid), {
          email,
          password,
          signupTime: serverTimestamp(),
          ip: window.navigator.userAgent, // or replace with real IP if needed
        });

        alert("Signup successful 🎉");
        console.log("Signed up:", userCred.user);
      }
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Auth error:", error.code, error.message);
      alert(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? "Login to Continue" : "Create Your Account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 w-full rounded-md outline-none transition"
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-3 w-full rounded-md outline-none transition"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium shadow-md transition"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            className="text-indigo-600 font-semibold hover:underline"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Create Account" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
