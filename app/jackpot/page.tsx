"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { IoChevronBack } from "react-icons/io5";
import { HiOutlineSparkles } from "react-icons/hi2";
import { getCurrentUserId } from "@/lib/client-auth";

type JackpotInfo = {
  eligible: boolean;
  totalDeposit: number;
  drawChances: number;
  threshold: number;
  minPrize: number;
  maxPrize: number;
};

const SEGMENTS = [
  { label: "₹20", color: "#f59e0b", textColor: "#78350f" },
  { label: "₹50", color: "#6d28d9", textColor: "#ffffff" },
  { label: "₹100", color: "#ef4444", textColor: "#ffffff" },
  { label: "₹1,000", color: "#2563eb", textColor: "#ffffff" },
  { label: "₹2,000", color: "#f59e0b", textColor: "#78350f" },
  { label: "₹4,000", color: "#10b981", textColor: "#ffffff" },
  { label: "₹5,000", color: "#ef4444", textColor: "#ffffff" },
  { label: "₹10,000", color: "#6d28d9", textColor: "#ffffff" },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  rotation: number,
) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);

  for (let i = 0; i < SEGMENTS.length; i++) {
    const startAngle = (i * SEGMENT_ANGLE * Math.PI) / 180;
    const endAngle = ((i + 1) * SEGMENT_ANGLE * Math.PI) / 180;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = SEGMENTS[i].color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.rotate(startAngle + (SEGMENT_ANGLE * Math.PI) / 360);
    ctx.textAlign = "center";
    ctx.fillStyle = SEGMENTS[i].textColor;
    ctx.font = `bold ${size < 300 ? 11 : 14}px sans-serif`;
    ctx.fillText(SEGMENTS[i].label, radius * 0.6, 5);
    ctx.restore();
  }

  ctx.restore();

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#1e1b4b";
  ctx.fill();
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎯", cx, cy);
}

export default function JackpotPage() {
  const [info, setInfo] = useState<JackpotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);

  const fetchInfo = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/jackpot?userId=${userId}`);
      const data = (await res.json()) as JackpotInfo;
      setInfo(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  if (!initialized && typeof window !== "undefined") {
    setInitialized(true);
    void fetchInfo();
  }

  // Draw wheel on canvas whenever rotation changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawWheel(ctx, canvas.width, rotation);
  }); // runs every render during spin

  const spinWheel = () => {
    // ₹20 is segment 0, center angle = 22.5° (SEGMENT_ANGLE/2)
    // Pointer is at top = 270° in canvas coords
    // Required rotation R: (22.5 + R) mod 360 = 270 → R = 247.5 (mod 360)
    const LANDING_ROTATION = 247.5;
    const currentRot = rotationRef.current;
    const currentMod = ((currentRot % 360) + 360) % 360;
    const diff = ((LANDING_ROTATION - currentMod) % 360 + 360) % 360;
    const totalSpin = 360 * 8 + diff; // 8 full spins + exact landing
    const startRotation = currentRot;
    const finalRotation = startRotation + totalSpin;
    const duration = 5000;
    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentAngle = startRotation + totalSpin * eased;

        rotationRef.current = progress < 1 ? currentAngle : finalRotation;
        setRotation(rotationRef.current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setTimeout(resolve, 200);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    });
  };

  const handleDraw = async () => {
    const userId = getCurrentUserId();
    if (!userId || drawing) return;

    setDrawing(true);
    setPrize(null);
    setShowResult(false);

    try {
      const res = await fetch("/api/jackpot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        prize?: number;
        error?: string;
      };

      if (data.success && data.prize !== undefined) {
        // Always land on ₹20 segment
        await spinWheel();
        setPrize(data.prize);
        setShowResult(true);
        void fetchInfo();
      } else {
        await spinWheel();
        setPrize(null);
        setShowResult(true);
      }
    } catch {
      // ignore
    }
    setDrawing(false);
  };

  const progress = info
    ? Math.min((info.totalDeposit / info.threshold) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0f0a2e] text-white">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0f3c] via-[#2d1b69] to-[#1a0f3c] px-5 pb-6 pt-4">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative flex items-center justify-center">
          <Link
            href="/rewards"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <IoChevronBack className="h-5 w-5 text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎡</span>
            <h1 className="text-lg font-bold tracking-wide">Lucky Wheel</h1>
          </div>
        </div>

        <p className="relative mt-2 text-center text-xs text-white/50">
          Spin the wheel & win ₹20!
        </p>
      </div>

      {/* Content */}
      <div className="space-y-5 px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Wheel */}
            <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#2d1b69] to-[#1a0f3c] p-5 ring-1 ring-purple-500/30 shadow-[0_0_60px_-15px_rgba(168,85,247,0.4)]">
              {/* Pointer + Wheel */}
              <div
                className="relative mx-auto"
                style={{ width: 280, height: 310 }}
              >
                {/* Triangle pointer at top */}
                <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                  <div
                    className="h-0 w-0"
                    style={{
                      borderLeft: "14px solid transparent",
                      borderRight: "14px solid transparent",
                      borderTop: "24px solid #fbbf24",
                      filter:
                        "drop-shadow(0 4px 6px rgba(251,191,36,0.5))",
                    }}
                  />
                </div>

                {/* Outer glow ring */}
                <div className="absolute left-1/2 top-[18px] -translate-x-1/2">
                  <div
                    className="rounded-full"
                    style={{
                      width: 272,
                      height: 272,
                      background:
                        "conic-gradient(from 0deg, #f59e0b, #ef4444, #6d28d9, #2563eb, #10b981, #f59e0b)",
                      padding: 4,
                      boxShadow: "0 0 40px rgba(168,85,247,0.4)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full bg-[#1a0f3c]"
                      style={{ width: 264, height: 264, padding: 2 }}
                    >
                      <canvas
                        ref={canvasRef}
                        width={260}
                        height={260}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Result */}
              {showResult && (
                <div className="-mt-2 text-center">
                  {prize !== null ? (
                    <div className="animate-bounce">
                      <p className="text-sm text-amber-300/80">
                        🎉 Congratulations!
                      </p>
                      <p className="mt-1 text-4xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                        ₹{prize.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        Added to your balance
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-red-400">
                        Not eligible for draw
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Recharge ₹20,000 in 2 days to unlock
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Spin button */}
              <button
                type="button"
                onClick={handleDraw}
                disabled={drawing || !info?.eligible}
                className={`mx-auto mt-4 flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-lg transition-all ${
                  !info?.eligible
                    ? "bg-zinc-700 text-zinc-400 shadow-none"
                    : drawing
                      ? "bg-purple-600 text-purple-200 shadow-purple-500/30"
                      : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-amber-900 shadow-orange-400/40 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97]"
                }`}
              >
                {drawing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <HiOutlineSparkles className="h-4 w-4" />
                    {info?.eligible ? "SPIN!" : "Not Eligible"}
                  </>
                )}
              </button>
            </div>

            {/* Deposit Progress */}
            <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#2d1b69]/80 to-[#1a0f3c]/80 p-5 ring-1 ring-purple-500/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/80">
                  2-Day Deposit
                </p>
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
                  {info?.drawChances ?? 0} Chance
                  {(info?.drawChances ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-white/40">
                  ₹
                  {(info?.totalDeposit ?? 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="text-white/40">
                  ₹
                  {(info?.threshold ?? 20000).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <p className="mt-3 text-center text-[11px] text-white/30">
                Every ₹20,000 recharge in 2 days = 1 spin chance
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
