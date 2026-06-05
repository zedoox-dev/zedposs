"use client";
import { useState, useEffect } from "react";
import { Lock, Delete, UserCircle2, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function POSLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const params = useParams();
  const router = useRouter();
  const outletId = params.outletId as string;

  // Database se PIN Verify karne ka function
  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin, outletId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // PIN Sahi Hai -> Seedha Dashboard par!
        router.push(`/pos/${outletId}/dashboard`);
      } else {
        // PIN Galat Hai -> Lal (Red) light jalao aur clear karo
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(true);
      setTimeout(() => setPin(""), 800);
    } finally {
      setIsVerifying(false);
    }
  };

  // Jab bhi 4 digits poore hon, automatically verification trigger karo
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isVerifying) {
      setPin((prev) => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (!isVerifying) {
      setPin((prev) => prev.slice(0, -1));
      setError(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 relative overflow-hidden">
        
        {/* Loading Overlay */}
        {isVerifying && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-orange-500" size={48} />
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-slate-700/50 rounded-full mb-4">
            <UserCircle2 size={48} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Staff Login</h1>
          <p className="text-slate-400 mt-1 text-sm">Enter your 4-digit PIN</p>
        </div>

        {/* PIN Indicators (Dots) */}
        <div className="flex justify-center space-x-4 mb-10">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                pin.length > index 
                  ? "bg-orange-500 scale-110 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                  : error 
                    ? "bg-red-500" 
                    : "bg-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Numpad Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 text-2xl font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-2xl transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
          <button className="h-16 flex items-center justify-center text-slate-500 rounded-2xl">
            <Lock size={24} />
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 text-2xl font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-2xl transition-colors active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 flex items-center justify-center text-slate-300 bg-slate-700/50 hover:bg-slate-600 rounded-2xl transition-colors active:scale-95"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
