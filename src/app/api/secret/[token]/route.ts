import { redis } from "../../../../../lib/redis";
import { NextRequest, NextResponse } from "next/server";

type RedisWithOptional = {
  get?: (k: string) => Promise<string | null>;
  getdel?: (k: string) => Promise<string | null>;
  del?: (k: string) => Promise<number>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const key = `secret:${token}`;

    // 🔥 Atomic get + delete (CRITICAL)
    let data: string | null = null;
    // Prefer a direct getdel if the client supports it
    const r = redis as unknown as RedisWithOptional;
    if (typeof r.getdel === "function") {
      data = await r.getdel(key);
    } else {
      const maybe = typeof r.get === "function" ? await r.get(key) : null;
      if (maybe !== null) {
        // try to delete if supported
        if (typeof r.del === "function") {
          await r.del(key);
        }
        data = maybe;
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: "Secret not found or already viewed" },
        { status: 404 }
      );
    }

    console.log(`Secret retrieved for token ${token}:`, data);
    const parsed = JSON.parse(data);

    return NextResponse.json({
      ciphertext: parsed.ciphertext,
      iv: parsed.iv
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}