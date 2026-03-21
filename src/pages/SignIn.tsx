import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { friendlySupabaseError } from "@/utils/translateError";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(friendlySupabaseError(authError));
      return;
    }

    const redirectTo = searchParams.get("redirect") || "/";
    navigate(redirectTo);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10 animate-reveal-up">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-[2rem] font-light uppercase tracking-[0.05em]">Welcome Back</h1>
          <p className="font-body text-[0.8rem] tracking-[0.08em] text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-editorial"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-editorial"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="font-body text-[0.75rem] text-destructive">{error}</p>
          )}

          <Button type="submit" variant="amber" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-center font-body text-[0.75rem] text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-accent hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
