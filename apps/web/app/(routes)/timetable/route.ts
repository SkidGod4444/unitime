import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Missing userId" },
      { status: 400 },
    );
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://unitime-backend.vercel.app/v1";
    // Usually the app uses EXPO_PUBLIC_API_URL but since this is Next.js, it might use NEXT_PUBLIC_API_URL
    const baseUrl = origin.includes("localhost")
      ? "http://localhost:3000/v1"
      : origin;

    const res = await fetch(`${baseUrl}/timetable/week/${userId}`);
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Timetable proxy error", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
