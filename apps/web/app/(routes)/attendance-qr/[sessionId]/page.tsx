"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Loader2 } from "lucide-react";

type AttendanceQRData = {
  qrString: string;
  course?: { name?: string; code?: string };
};

export default function AttendanceQRPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [qrData, setQrData] = useState<AttendanceQRData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetchQR = async () => {
      try {
        const origin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/v1";
        
        const res = await fetch(`${origin}/attendance/qr/session/${sessionId}`);
        
        let data: unknown;
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        
        const responseData = data as { error?: string } & AttendanceQRData;
        
        if (res.ok) {
          setQrData(responseData);
          setError("");
        } else {
          setError(responseData?.error || "Failed to load QR code");
        }
      } catch {
        setError("Network error. Retrying...");
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
    const interval = setInterval(fetchQR, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center font-sans p-6 text-center text-[#1a1614]">
         {/* Subtle grain */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />
        
        <div className="relative z-10 bg-white/80 backdrop-blur-md p-8 rounded-3xl max-w-md w-full border border-black/[0.04] shadow-xl shadow-black/[0.02]">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 font-bold text-xl">!</span>
          </div>
          <p className="font-bold font-lora text-2xl mb-2 text-gray-900">Session Unavailable</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            {error || "This attendance session might have ended or does not exist."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1614] font-sans selection:bg-red-100 selection:text-red-700 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Subtle grain */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-red-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/[0.03] border border-black/[0.04] overflow-hidden p-8 md:p-12 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-semibold tracking-[0.1em] uppercase mb-8 border border-red-100/50">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live Attendance
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-lora text-center mb-1.5 tracking-tight text-gray-900">
          {qrData.course?.name || "Attendance Code"}
        </h1>
        <p className="text-[#6b5f5a] text-sm md:text-base mb-10 text-center font-medium tracking-wide">
          {qrData.course?.code || "UNiTIME"} • Scan using the mobile app
        </p>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#e8e2de] w-full aspect-square max-w-[320px] flex items-center justify-center relative group">
          <div className="absolute inset-0 bg-linear-to-tr from-red-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl -z-10" />
          <QRCode
            value={qrData.qrString}
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
            level="H"
            fgColor="#1a1614"
          />
        </div>

        <p className="mt-8 text-xs text-[#9d8f8a] text-center px-4 leading-relaxed font-medium">
          QR code refreshes automatically for security.<br className="hidden sm:block" /> Do not screenshot.
        </p>
      </div>
    </div>
  );
}
