import React, { useState, forwardRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, LogOut } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Community", to: "/community" },
  { label: "My Rooms", to: "/my-rooms" },
];

const Layout = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const truncatedEmail = user?.email
    ? user.email.length > 20
      ? user.email.slice(0, 20) + "…"
      : user.email
    : null;

  return (
    <div ref={ref} className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="w-full flex h-14 items-center justify-between px-8">
          <Link to="/" className="flex items-center">
            <span className="font-heading text-[1.25rem] tracking-[0.2em] uppercase text-accent">
              ROOMAI
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-body text-[0.75rem] tracking-[0.15em] uppercase transition-colors duration-200 ${
                  location.pathname === link.to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
              )}
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <span className="font-body text-[0.75rem] text-muted-foreground">{truncatedEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/sign-in"
                className="hidden md:block font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent hover:underline transition-all"
              >
                Sign In
              </Link>
            )}

            <button
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background p-6 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`font-body text-[0.75rem] tracking-[0.15em] uppercase ${
                    location.pathname === link.to ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <span className="font-body text-[0.75rem] text-muted-foreground">{truncatedEmail}</span>
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-muted-foreground text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
});

Layout.displayName = "Layout";

export default Layout;
