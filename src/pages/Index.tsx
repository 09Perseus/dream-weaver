import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CommunityCard from "@/components/CommunityCard";
import GeneratingOverlay from "@/components/GeneratingOverlay";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { PlacedItem, FurnitureDetail } from "@/lib/edgeFunctions";

interface FeaturedPost {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  like_count: number;
  room_design_id: string;
  user_id: string;
}

/* ── Room outline SVG ── */
const RoomIllustration = () => (
  <svg viewBox="0 0 400 280" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    {/* Floor */}
    <path d="M40 200 L200 260 L360 200 L200 160 Z" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />
    {/* Back wall left */}
    <path d="M40 200 L40 80 L200 40 L200 160 Z" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />
    {/* Back wall right */}
    <path d="M200 40 L360 80 L360 200 L200 160 Z" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />
    {/* Sofa silhouette */}
    <rect x="80" y="175" width="80" height="25" rx="2" stroke="hsl(var(--border))" strokeWidth="1" fill="hsl(var(--surface))" opacity="0.5" />
    <rect x="80" y="165" width="80" height="12" rx="2" stroke="hsl(var(--border))" strokeWidth="1" fill="hsl(var(--surface))" opacity="0.3" />
    {/* Table silhouette */}
    <rect x="220" y="185" width="50" height="15" rx="1" stroke="hsl(var(--border))" strokeWidth="1" fill="hsl(var(--surface))" opacity="0.4" />
    {/* Lamp silhouette */}
    <line x1="300" y1="120" x2="300" y2="180" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
    <ellipse cx="300" cy="118" rx="15" ry="8" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.4" />
    {/* Plant silhouette */}
    <circle cx="120" cy="130" r="12" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3" />
    <line x1="120" y1="142" x2="120" y2="160" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
  </svg>
);

/* ── Mock product card ── */
const MockProductCard = () => (
  <div className="border border-border bg-surface p-6 max-w-[280px] mx-auto">
    <div className="aspect-square bg-background border border-border flex items-center justify-center mb-4">
      <svg viewBox="0 0 100 80" fill="none" className="w-2/3 opacity-40" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="30" width="80" height="35" rx="4" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <rect x="10" y="20" width="25" height="15" rx="3" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <rect x="65" y="20" width="25" height="15" rx="3" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <rect x="15" y="65" width="6" height="8" rx="1" stroke="hsl(var(--border))" strokeWidth="1" />
        <rect x="79" y="65" width="6" height="8" rx="1" stroke="hsl(var(--border))" strokeWidth="1" />
      </svg>
    </div>
    <p className="font-heading text-[1.1rem] font-normal text-foreground">Oslo Corner Sofa</p>
    <p className="font-body text-[0.85rem] text-accent mt-1">$1,299</p>
    <button className="mt-4 font-body text-[0.7rem] tracking-[0.1em] uppercase text-accent hover:underline cursor-pointer">
      ADD TO CART →
    </button>
  </div>
);

/* ── Section divider ── */
const Divider = () => (
  <div className="px-8">
    <div className="border-t border-border" />
  </div>
);

/* ── Prompt input + button (reusable) ── */
function PromptInput({
  prompt,
  setPrompt,
  error,
  setError,
  loading,
  onGenerate,
  onFocusChange,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  error: string;
  setError: (v: string) => void;
  loading: boolean;
  onGenerate: () => void;
  onFocusChange?: (focused: boolean) => void;
}) {
  return (
    <div className="space-y-4 max-w-[600px] w-full mx-auto" style={{ marginTop: "1.5rem" }}>
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (error) setError("");
          }}
          placeholder="A cozy Japanese bedroom with warm lighting…"
          rows={2}
          className="w-full bg-background font-heading text-[1.15rem] text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 resize-none relative"
          style={{
            border: "1.5px solid hsl(var(--accent))",
            borderRadius: "8px",
            padding: "0.875rem 1.25rem",
            lineHeight: 1.5,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onGenerate();
            }
          }}
          onFocus={(e) => {
            onFocusChange?.(true);
            e.currentTarget.style.borderColor = "hsl(var(--accent-hover))";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(var(--accent-rgb), 0.15)";
          }}
          onBlur={(e) => {
            onFocusChange?.(false);
            e.currentTarget.style.borderColor = "hsl(var(--accent))";
            e.currentTarget.style.boxShadow = "none";
          }}
          disabled={loading}
        />
        {/* Character count */}
        <div className="absolute bottom-2 right-3 font-body text-[0.65rem] text-muted-foreground tracking-[0.05em]">
          {prompt.length}/500
        </div>
        {error && (
          <p className="font-body text-destructive text-[0.75rem] mt-2 text-left">{error}</p>
        )}
      </div>

      {/* Hint for empty state */}
      {prompt.length === 0 && (
        <p className="font-body text-[0.7rem] text-muted-foreground tracking-[0.1em] uppercase animate-fade-pulse">
          Start typing your dream room ↓
        </p>
      )}

      <Button
        variant="amber"
        size="lg"
        className={`w-full ${loading ? "button-loading" : ""}`}
        style={{ borderRadius: "8px", marginTop: "0.5rem" }}
        onClick={onGenerate}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate Room"}
      </Button>
    </div>
  );
}

/* ── Scroll-reveal section wrapper ── */
function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, visible] = useScrollReveal(0.15);
  return (
    <div ref={ref} className={`reveal ${visible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ════════════════ Main Page ════════════════ */

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const navigate = useNavigate();

  // Typing animation
  const roomTypes = ["BEDROOM.", "LIVING ROOM.", "HOME OFFICE.", "DINING ROOM.", "STUDIO.", "SANCTUARY."];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = roomTypes[currentIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(current.substring(0, typedText.length + 1));
        if (typedText.length + 1 === current.length) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setTypedText(current.substring(0, typedText.length - 1));
        if (typedText.length - 1 === 0) {
          setIsDeleting(false);
          setCurrentIndex(prev => (prev + 1) % roomTypes.length);
        }
      }
    }, isDeleting ? 60 : 100);
    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, currentIndex]);

  useEffect(() => {
    supabase
      .from("community_posts")
      .select("*")
      .eq("is_visible", true)
      .order("like_count", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data) setFeaturedPosts(data as unknown as FeaturedPost[]);
      });
  }, []);

  const validate = (): boolean => {
    if (!prompt.trim()) {
      setError("Please describe your dream room first");
      return false;
    }
    if (prompt.trim().length < 10) {
      setError("Please add a bit more detail");
      return false;
    }
    setError("");
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-room", {
        body: { description: prompt.trim() },
      });
      const errorMessage = fnError?.message || data?.error || "";
      if (fnError || data?.error) {
        console.error("Generate room error:", fnError || data?.error);
        if (errorMessage.includes("empty")) {
          toast({ title: "No furniture available", description: "No furniture in the library yet.", variant: "destructive" });
        } else if (errorMessage.includes("timeout")) {
          toast({ title: "Timed out", description: "Room generation timed out. Please try again.", variant: "destructive" });
        } else if (errorMessage.includes("valid furniture")) {
          toast({ title: "Design failed", description: "Could not design a room. Try being more specific.", variant: "destructive" });
        } else {
          toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      const items: PlacedItem[] = data.items;
      const furniture: FurnitureDetail[] = data.furniture;
      const { data: { session } } = await supabase.auth.getSession();
      const { data: room, error: insertError } = await supabase
        .from("room_designs")
        .insert({ description: prompt.trim(), items: items as any, user_id: session?.user?.id, share_token: crypto.randomUUID() })
        .select("id")
        .single();

      if (insertError || !room?.id) {
        toast({ title: "Failed to save room", description: "Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      navigate(`/room/${room.id}`, { state: { items, furniture, description: prompt.trim() } });
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fillExamplePrompt = () => {
    setPrompt("cozy japandi bedroom with warm lighting");
    setError("");
  };

  return (
    <div>
      {loading && <GeneratingOverlay />}

      {/* ═══ HERO ═══ */}
      <section className="hero-section relative flex flex-col items-center justify-center px-4 min-h-[100vh]" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="max-w-3xl w-full text-center space-y-4">
          {/* Eyebrow */}
          <div className="animate-reveal-up flex items-center justify-center gap-0">
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "hsl(var(--accent))",
                marginRight: "0.5rem",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}
            />
            <span className="font-body tracking-[0.25em] uppercase text-accent" style={{ fontSize: "clamp(0.6rem, 1vw, 0.7rem)" }}>
              AI-POWERED INTERIOR DESIGN
            </span>
          </div>

          {/* Headline */}
          <div className="animate-reveal-up delay-100">
            <h1
              className="font-heading font-light uppercase tracking-[0.04em] text-foreground leading-[1.05]"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              DESCRIBE YOUR DREAM
              <br />
              <span
                className="hero-gradient-text"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-hover)) 50%, hsl(var(--accent-blue)) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontSize: "clamp(2rem, 5vw, 4rem)",
                }}
              >
                {typedText}
              </span>
              <span
                style={{
                  display: "inline-block",
                  width: "3px",
                  height: "0.85em",
                  background: "hsl(var(--accent))",
                  marginLeft: "4px",
                  verticalAlign: "middle",
                  animation: "blink 1s step-end infinite",
                }}
              />
            </h1>
          </div>

          {/* Sub-headline */}
          <p
            className="animate-reveal-up delay-200 font-body text-muted-foreground tracking-[0.05em]"
            style={{ fontSize: "clamp(0.75rem, 1.5vw, 0.9rem)", marginTop: "0.75rem" }}
          >
            Walk into it in seconds. Buy what you see.
          </p>

          {/* Input */}
          <div className="animate-reveal-up delay-300">
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              error={error}
              setError={setError}
              loading={loading}
              onGenerate={handleGenerate}
              onFocusChange={setInputFocused}
            />
          </div>
        </div>

        {/* Scroll indicator — hidden when input focused or has text */}
        {!inputFocused && prompt.length === 0 && (
          <div className="absolute bottom-6 flex flex-col items-center gap-2">
            <span className="font-body text-[0.65rem] tracking-[0.2em] uppercase text-muted-foreground">
              Scroll
            </span>
            <div
              className="w-px bg-accent"
              style={{
                height: 32,
                animation: "scroll-line 2s ease-in-out infinite",
              }}
            />
          </div>
        )}
      </section>

      <Divider />

      {/* ═══ FEATURE 1 — AI Room Generator ═══ */}
      <section className="feature-section feature-pattern-1 min-h-[80vh] flex items-center">
        <div className="container py-20 md:py-28">
          <RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Text */}
              <div className="space-y-6 order-2 md:order-1">
                <div className="reveal-delay-1">
                  <span className="font-body text-[0.65rem] tracking-[0.2em] uppercase text-accent">
                    01 — AI ROOM GENERATOR
                  </span>
                </div>
                <h2
                  className="font-heading font-light text-foreground reveal-delay-1"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
                >
                  From one sentence to a furnished room.
                </h2>
                <p className="font-body text-[0.85rem] text-muted-foreground leading-[1.7] max-w-[420px] reveal-delay-2">
                  Describe your dream space in plain English. Our AI selects furniture, positions every piece, and
                  renders your room in immersive 3D — in seconds.
                </p>
                <button
                  onClick={fillExamplePrompt}
                  className="inline-block bg-surface border border-border font-body italic text-[0.8rem] text-muted-foreground px-4 py-2 hover:border-accent hover:text-accent transition-colors cursor-pointer reveal-delay-3"
                >
                  Try: cozy japandi bedroom with warm lighting →
                </button>
              </div>

              {/* Visual */}
              <div className="relative border border-border bg-surface p-6 aspect-[4/3] flex items-center justify-center order-1 md:order-2">
                <RoomIllustration />
                <span className="absolute top-3 right-3 font-body text-[0.6rem] tracking-[0.1em] uppercase text-accent">
                  AI
                </span>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FEATURE 2 — Shop the Room ═══ */}
      <section className="feature-section feature-pattern-2 min-h-[80vh] flex items-center">
        <div className="container py-20 md:py-28">
          <RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Visual */}
              <div className="flex justify-center">
                <MockProductCard />
              </div>

              {/* Text */}
              <div className="space-y-6">
                <span className="font-body text-[0.65rem] tracking-[0.2em] uppercase text-accent">
                  02 — SHOP THE ROOM
                </span>
                <h2
                  className="font-heading font-light text-foreground"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
                >
                  Click anything. Buy everything.
                </h2>
                <p className="font-body text-[0.85rem] text-muted-foreground leading-[1.7] max-w-[420px]">
                  Every piece of furniture in your AI room is real and purchasable. Click any item to see its details
                  and add it to your cart instantly.
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ FEATURE 3 — Community ═══ */}
      <section className="feature-section feature-pattern-3 min-h-[60vh] flex items-center">
        <div className="container py-20 md:py-28 w-full">
          <RevealSection>
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
              <span className="font-body text-[0.65rem] tracking-[0.2em] uppercase text-accent">
                03 — COMMUNITY
              </span>
              <h2
                className="font-heading font-light text-foreground"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              >
                Rooms designed by people like you.
              </h2>
              <p className="font-body text-[0.85rem] text-muted-foreground leading-[1.7]">
                Post your room to the community feed. Get inspired by others. Copy a room you love and make it your
                own.
              </p>
            </div>
          </RevealSection>

          {featuredPosts.length > 0 && (
            <RevealSection>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPosts.map((post, i) => (
                  <CommunityCard
                    key={post.id}
                    id={post.id}
                    roomDesignId={post.room_design_id}
                    title={post.title}
                    description={post.description}
                    author="Community Member"
                    thumbnailUrl={post.thumbnail_url ?? undefined}
                    likeCount={post.like_count}
                    delay={100 + i * 80}
                  />
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link
                  to="/community"
                  className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent hover:underline transition-all"
                >
                  VIEW ALL ROOMS →
                </Link>
              </div>
            </RevealSection>
          )}
        </div>
      </section>

      <Divider />

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 md:py-32 px-4">
        <RevealSection className="text-center space-y-10">
          <h2
            className="font-heading font-light uppercase text-foreground"
            style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)" }}
          >
            Ready to design your room?
          </h2>
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            error={error}
            setError={setError}
            loading={loading}
            onGenerate={handleGenerate}
          />
        </RevealSection>
      </section>
    </div>
  );
}
