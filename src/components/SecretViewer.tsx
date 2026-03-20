"use client";

import React, { useState } from "react";
import Link from "next/link";
import { decryptSecret } from "../../lib/crypto";
import Toast from "./Toast";
import { Eye, Clipboard, AlertTriangle, Lock, Home, ShieldCheck, AlertCircle, ShieldAlert } from "lucide-react";

type Props = { token: string };

export default function SecretViewer({ token }: Props) {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleReveal() {
    try {
      setLoading(true);
      setError(null);

      const key = window.location.hash.substring(1);
      if (!key) {
        setError("Missing decryption key in URL fragment.");
        return;
      }

      const res = await fetch(`/api/secret/${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setExpired(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to fetch secret");
        return;
      }

      const data = await res.json();
      const { ciphertext, iv } = data as { ciphertext?: string; iv?: string };
      if (!ciphertext || !iv) {
        setError("Malformed secret response");
        return;
      }

      const decrypted = await decryptSecret(ciphertext, iv, key);
      setSecret(decrypted);
      setRevealed(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-background text-foreground">
        <div className="max-w-lg w-full container-max">
          <div className="rounded-xl p-8 text-center shadow-[0_20px_60px_rgba(6,2,10,0.6)] bg-surface">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-danger">
              <ShieldAlert className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Link Expired or Invalid</h3>
            <p className="mb-6 text-sm text-muted">This secret has already been viewed, deleted, or has reached its expiration time. For security, it can no longer be accessed.</p>
            <div>
              <Link href="/" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm border border-border text-foreground">
                <Home className="h-4 w-4" />
                Go Back Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-background text-foreground">
      <div className="max-w-3xl w-full container-max">
        <div className="rounded-xl p-8 shadow-[0_20px_60px_rgba(6,2,10,0.6)] bg-surface">
          <div className="max-w-xl mx-auto text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <ShieldCheck className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Confidential Message</h2>
            <p className="mb-6 text-muted">You&apos;ve received a secure secret link.</p>

            {!revealed ? (
              <>
                <button
                  onClick={handleReveal}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium text-white shadow-md disabled:opacity-60 btn-elevate bg-accent"
                >
                  {loading ? "Revealing..." : <><Eye className="h-4 w-4" /> Reveal Secret</>}
                </button>
                <p className="mt-4 text-xs text-danger"><AlertCircle className="h-4 w-4 inline-block mr-1 align-text-bottom" /> The link will become invalid the moment you click &quot;Reveal&quot;.</p>
                {error && <p className="mt-4 text-sm text-danger">{error}</p>}
              </>
            ) : (
              <>
                <div className="mt-6">
                  <div className="relative">
                    <textarea readOnly value={secret ?? ""} className="w-full textarea-responsive rounded-md border p-4 bg-background border-border text-foreground" />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(secret ?? "");
                          setToast("Copied secret to clipboard");
                        } catch (e) {
                          console.error(e);
                          setToast("Failed to copy to clipboard");
                        }
                      }}
                      className="absolute right-3 top-3 p-2 rounded-md transition btn-elevate bg-surface border border-border"
                      aria-label="Copy secret"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 rounded-md p-4 text-sm bg-danger/10 border border-danger/20 text-danger">
                    This content has been erased from our servers. Closing this tab or refreshing will make it inaccessible forever.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-8 text-sm">
          <Link href="/" className="text-muted inline-flex items-center gap-2 justify-center">
            <Home className="h-4 w-4" />
            Create your own secure link
          </Link>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
