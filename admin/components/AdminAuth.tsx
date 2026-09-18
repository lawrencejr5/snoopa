"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";

interface AdminAuthProps {
  onAuthenticated: (token: string) => void;
}

export default function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useMutation(api.admin.signInAdmin);
  const signUp = useMutation(api.admin.signUpAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    try {
      let res;
      if (isSignUp) {
        res = await signUp({ email, password, name: name || undefined });
      } else {
        res = await signIn({ email, password });
      }

      if (res && res.token) {
        localStorage.setItem("snoopa_admin_token", res.token);
        onAuthenticated(res.token);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">S</div>
          <h1 className="auth-title font-header">Snoopa Admin</h1>
          <p className="auth-subtitle">
            {isSignUp ? "Create a new admin investigator account" : "Enter your credentials to access intel"}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: "relative" }}>
                <User
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    width: 16,
                    height: 16,
                    color: "var(--text-secondary)",
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  width: 16,
                  height: 16,
                  color: "var(--text-secondary)",
                }}
              />
              <input
                type="email"
                className="input-field"
                placeholder="admin@snoopa.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  width: 16,
                  height: 16,
                  color: "var(--text-secondary)",
                }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                {isSignUp ? "Create Admin Account" : "Access Dashboard"}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>
        </form>

        <div className="auth-toggle-row">
          <span>{isSignUp ? "Already have an admin account?" : "Need an admin account?"}</span>
          <span
            className="auth-toggle-link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp ? "Sign In" : "Create Account"}
          </span>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <span className="badge badge-muted" style={{ fontSize: 11 }}>
            <ShieldCheck style={{ width: 12, height: 12, color: "var(--accent-green)" }} /> Protected Admin Endpoint
          </span>
        </div>
      </div>
    </div>
  );
}
