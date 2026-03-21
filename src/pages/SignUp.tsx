import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess("Account created! Please check your email to confirm your account, then sign in.");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10 animate-reveal-up">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-[2rem] font-light uppercase tracking-[0.05em]">Create Account</h1>
          <p className="font-body text-[0.8rem] tracking-[0.08em] text-muted-foreground">Start designing rooms with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">Email</label>
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
            <label htmlFor="password" className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="input-editorial"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-editorial"
              required
              disabled={loading}
            />
          </div>

          {error && <p className="font-body text-[0.75rem] text-destructive">{error}</p>}
          {success && <p className="font-body text-[0.75rem] text-success">{success}</p>}

          <Button type="submit" variant="amber" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="text-center font-body text-[0.75rem] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-accent hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
