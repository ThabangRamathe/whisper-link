"use client";

import React, { useState } from "react";
import { Copy, EyeOff, Link, Lock, Shield } from "lucide-react";
import { encryptSecret } from "../../../lib/crypto";
import Toast from "../../components/Toast";

export default function Home() {
  const [secret, setSecret] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [expiration, setExpiration] = useState<string>("24");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  async function handleCreate() {
    try {
      setIsCreating(true);

      const { ciphertext, iv, key } = await encryptSecret(secret);

      const res = await fetch("/api/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext, iv, expiration })
      });

      if (!res.ok) {
        throw new Error("Failed to create secret");
      }

      const { token } = await res.json();

      // Key goes in fragment (never sent to server)
      const url = `${window.location.origin}/secret/${token}#${key}`;

      setLink(url);
    } catch (err) {
      console.error(err);
      setToast(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl w-full container-max">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
            <p className="text-sm uppercase tracking-wider text-muted">
              <Shield className="inline-block h-4 w-4 mr-1 align-text-bottom" />
              Confidential & Secure
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold">
            <span className="text-white">Whisper</span>
            <span className="text-accent">Link</span>
          </h1>
          <p className="mt-4 text-muted max-w-2xl mx-auto text-sm sm:text-base">
            Share sensitive information with confidence. Generate links that automatically self-destruct after the first time they are viewed.
          </p>
        </header>

        {/* Render either the form (when no link) or the generated-link view (when link exists) */}
        {!link ? (
          <main className="bg-surface border border-border rounded-xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            <div className="max-w-xl mx-auto text-center">
              <p className="mb-6 text-sm text-primary uppercase"><Lock className="inline-block h-4 w-4 mr-1 align-text-bottom" />WhisperLink Secure</p>
              <h2 className="text-2xl font-bold mb-2">Secure a Secret</h2>
              <p className="text-muted-foreground mb-6">Input your sensitive information below. We&apos;ll generate a secure, one-time link that vanishes after being viewed.</p>

              <label className="block text-sm font-medium mb-2">Your Secret</label>
              <textarea
                className="w-full textarea-responsive rounded-md bg-background border border-border p-4 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm sm:text-base"
                placeholder="Paste passwords, keys, or sensitive notes here..."
                value={secret}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSecret(e.target.value)}
              />

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Expiration</label>
                  <select
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    className="ml-2 rounded-md bg-background border border-border text-foreground p-2"
                  >
                    <option value="1">1 Hour</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>

                <div className="w-full sm:ml-auto sm:w-auto">
                  <button
                    onClick={handleCreate}
                    disabled={!secret || isCreating}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 btn-elevate bg-accent"
                  >
                    <Link className="h-4 w-4 opacity-90" />
                    {isCreating ? "Generating..." : "Generate Secure Link"}
                  </button>
                </div>
              </div>

              <p className="mt-6 text-xs text-muted"><EyeOff className="inline-block h-4 w-4 mr-1 align-text-bottom" />Secrets are never stored permanently and vanish after retrieval.</p>
            </div>
          </main>
        ) : (
          <main className="bg-surface border border-border rounded-xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-center mb-3 text-sm text-accent border uppercase"><Lock className="inline-block h-4 w-4 mr-1 align-text-bottom" />Secret Link Ready</div>
              <h2 className="text-2xl font-bold mb-2">Share your One-Time Link</h2>
              <p className="text-muted mb-4">This link will self-destruct after the first time it is viewed or after the selected expiration.</p>

              <div className="bg-background border border-border rounded-md p-4 mb-4">
                <code className="block break-all text-sm text-accent">{link}</code>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setToast("Copied secret link to clipboard");
                    } catch (e) {
                      console.error("Clipboard write failed", e);
                      setToast("Failed to copy to clipboard");
                    }
                  }}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition transform btn-elevate bg-accent"
                >
                  <Copy className="h-4 w-4" />
                  Copy Secret Link
                </button>

                <button
                  onClick={() => {
                    setSecret("");
                    setLink("");
                  }}
                  className="text-sm text-muted underline"
                >
                  Create Another Secret
                </button>
              </div>
            </div>
          </main>
        )}

        <footer className="mt-8 text-center relative z-10">
          <div className="flex flex-col gap-2 items-center">
            <p className="text-muted-foreground text-sm font-medium">
              &copy; {new Date().getFullYear()} WhisperLink. Privacy by default.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 mt-2 text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold">
              <span>Zero Persistence</span>
              <span>One-Time View</span>
              <span>AES-256 Compliant</span>
            </div>
          </div>
        </footer>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}