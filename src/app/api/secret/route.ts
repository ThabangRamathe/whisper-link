import { nanoid } from "nanoid";
import { redis } from "../../../../lib/redis";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TTL_SECONDS = 60 * 10; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ciphertext, iv, expiration } = body as {
      ciphertext?: string;
      iv?: string;
      expiration?: string | number;
    };

    // Basic validation
    if (!ciphertext || !iv) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (ciphertext.length > 100_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const token = nanoid(16); // high entropy

    const value = JSON.stringify({
      ciphertext,
      iv,
      createdAt: Date.now()
    });

    // Interpret expiration (hours) if provided, otherwise use default TTL
    let ttl = DEFAULT_TTL_SECONDS;
    if (expiration) {
      const hours = typeof expiration === "string" ? parseFloat(expiration) : Number(expiration);
      if (!Number.isNaN(hours) && hours > 0) ttl = Math.round(hours * 3600);
    }

    await redis.set(`secret:${token}`, value, "EX", ttl);

    return NextResponse.json({ token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}