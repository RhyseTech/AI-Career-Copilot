"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UserProfile {
  id: number;
  email: string;
  full_name?: string;
  created_at: string;
}

interface AuthPayload {
  token: string;
  user: UserProfile;
}

interface SessionItem {
  id: number;
  title?: string;
  role_title?: string;
  match_score?: number;
  created_at?: string;
}

interface ProgressSummary {
  event_counts?: Record<string, number>;
  average_score?: number | null;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || "Request failed.");
  return payload as T;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("careerCopilotToken") : "";

  useEffect(() => {
    const storedUser = localStorage.getItem("careerCopilotUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as UserProfile);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const loadMemory = async () => {
      if (!token) return;
      try {
        const [sessionsPayload, progressPayload] = await Promise.all([
          fetchJson<{ sessions?: SessionItem[] }>(`${API}/api/memory/sessions?limit=5`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetchJson<ProgressSummary>(`${API}/api/memory/progress`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setSessions(sessionsPayload.sessions || []);
        setProgress(progressPayload);
      } catch {
        setSessions([]);
        setProgress(null);
      }
    };
    void loadMemory();
  }, [token]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchJson<AuthPayload>(
        mode === "login" ? `${API}/api/memory/login` : `${API}/api/memory/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : { email, password, full_name: fullName }
          ),
        }
      );
      localStorage.setItem("careerCopilotToken", payload.token);
      localStorage.setItem("careerCopilotUser", JSON.stringify(payload.user));
      setUser(payload.user);
      router.push("/analyze");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("careerCopilotToken");
    localStorage.removeItem("careerCopilotUser");
    setUser(null);
    setSessions([]);
    setProgress(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "30px 22px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 20 }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}>
            CareerCopilot
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/analyze" className="btn-secondary" style={{ padding: "10px 14px", textDecoration: "none" }}>
              Analyze
            </Link>
            <Link href="/dashboard" className="btn-secondary" style={{ padding: "10px 14px", textDecoration: "none" }}>
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="glass-card" style={{ padding: 24 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>Account Memory</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
            Save sessions, restore old analyses, and track your career progress across visits.
          </p>

          {user ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ color: "var(--text-secondary)" }}>
                Signed in as <strong style={{ color: "var(--text-primary)" }}>{user.full_name || user.email}</strong>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-primary" style={{ padding: "10px 14px" }} onClick={() => router.push("/analyze")}>
                  Continue to Analyze
                </button>
                <button className="btn-secondary" style={{ padding: "10px 14px" }} onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
                  Login
                </button>
                <button className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
                  Register
                </button>
              </div>

              {mode === "register" ? (
                <input
                  className="input-glass"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              ) : null}
              <input className="input-glass" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input
                className="input-glass"
                type="password"
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error ? <div style={{ color: "#fda4af" }}>{error}</div> : null}
              <button className="btn-primary" style={{ padding: "12px 16px" }} onClick={() => void handleSubmit()} disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
              </button>
            </div>
          )}
        </div>

        {user ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Progress summary</h2>
              <div style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Average score: <strong style={{ color: "var(--text-primary)" }}>{Math.round(progress?.average_score || 0)}%</strong>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {Object.entries(progress?.event_counts || {}).map(([key, value]) => (
                  <div key={key} style={{ color: "var(--text-secondary)" }}>
                    {key.replace(/_/g, " ")}: <strong style={{ color: "var(--text-primary)" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Recent sessions</h2>
              {sessions.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {sessions.map((session) => (
                    <div key={session.id} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                      <div style={{ fontWeight: 600 }}>{session.title || session.role_title || "Career analysis"}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        Match score: {Math.round(session.match_score || 0)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)" }}>No saved sessions yet. Run one analysis first.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
