import React, { useState, forwardRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-amber flex items-center justify-center">
              <span className="text-amber-foreground font-bold text-sm">R</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              Room<span className="text-amber">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={location.pathname === link.to ? "text-amber" : "text-muted-foreground"}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber text-amber-foreground text-xs font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{truncatedEmail}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link to="/sign-in" className="hidden md:block">
                <Button variant="amber-outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-background p-4 animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${location.pathname === link.to ? "text-amber" : ""}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground px-4 py-2">{truncatedEmail}</span>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                  <Button variant="amber-outline" className="w-full">
                    Sign In
                  </Button>
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
