import React, { useState, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { label: "Community", to: "/community" },
  { label: "My Rooms", to: "/my-rooms" },
];

const Layout = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
  const { totalItems } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Link to="/sign-in" className="hidden md:block">
              <Button variant="amber-outline" size="sm">
                Sign In
              </Button>
            </Link>
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
              <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                <Button variant="amber-outline" className="w-full">
                  Sign In
                </Button>
              </Link>
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
