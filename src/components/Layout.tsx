import React, { useState, useRef, useEffect, forwardRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, LayoutGrid, ShoppingBag, Pencil, LogOut, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/contexts/CurrencyContext";
import UserAvatar from "@/components/UserAvatar";
import EditProfileDialog from "@/components/EditProfileDialog";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

const navLinks = [
  { label: "Community", to: "/community" },
  { label: "My Rooms", to: "/my-rooms" },
];

const Layout = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
  const { totalItems } = useCart();
  const { user, session, profile, signOut, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate("/");
  };

  const avatarInitial = profile?.display_name
    ? profile.display_name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : "?";

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "MMMM yyyy")
    : null;

  return (
    <div ref={ref} className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="w-full flex h-14 items-center justify-between px-4 md:px-8">
          {/* Left: hamburger on mobile */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center">
              <span className="font-heading text-[1.25rem] tracking-[0.2em] uppercase text-accent">
                ROOMAI
              </span>
            </Link>
          </div>

          {/* Desktop nav links */}
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

          {/* Right: cart + avatar */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/cart" className="relative min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              {totalItems > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />
              )}
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    avatarColor={profile?.avatar_color}
                    displayName={profile?.display_name}
                    email={user.email}
                    size={36}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-[48px] z-50 bg-surface border border-border"
                    style={{ width: isMobile ? 'calc(100vw - 2rem)' : 240 }}
                  >
                    <div className="p-4 border-b border-border">
                      <p className="font-body text-[0.75rem] text-muted-foreground truncate">
                        {user.email}
                      </p>
                      {memberSince && (
                        <p className="font-body text-[0.7rem] text-muted-foreground mt-1">
                          Member since {memberSince}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/my-rooms"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer min-h-[44px]"
                    >
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      My Rooms
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/orders"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer min-h-[44px]"
                    >
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      My Orders
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setEditProfileOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer min-h-[44px]"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                      Edit Profile
                    </button>

                    <div className="border-b border-border" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-muted-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer min-h-[44px]"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      Sign Out
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setDeleteAccountOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer min-h-[44px]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/sign-in"
                className="hidden md:block font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent hover:underline transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-full max-w-xs bg-background p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <nav className="flex flex-col pt-14">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`font-body text-[0.8rem] tracking-[0.15em] uppercase px-6 py-4 border-b border-border min-h-[52px] flex items-center ${
                  location.pathname === link.to ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="font-body text-[0.8rem] tracking-[0.15em] uppercase px-6 py-4 border-b border-border min-h-[52px] flex items-center gap-2 text-muted-foreground"
            >
              Cart
              {totalItems > 0 && (
                <span className="font-body text-[0.7rem] text-accent">({totalItems})</span>
              )}
            </Link>
            {user ? (
              <>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    avatarColor={profile?.avatar_color}
                    displayName={profile?.display_name}
                    email={user.email}
                    size={28}
                  />
                  <span className="font-body text-[0.75rem] text-muted-foreground truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => { setMobileOpen(false); setEditProfileOpen(true); }}
                  className="font-body text-[0.8rem] tracking-[0.15em] uppercase text-muted-foreground text-left px-6 py-4 border-b border-border min-h-[52px]"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  className="font-body text-[0.8rem] tracking-[0.15em] uppercase text-muted-foreground text-left px-6 py-4 border-b border-border min-h-[52px]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="font-body text-[0.8rem] tracking-[0.15em] uppercase text-accent px-6 py-4 border-b border-border min-h-[52px] flex items-center"
              >
                Sign In
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <main className="flex-1">{children}</main>

      {user && (
        <>
          <EditProfileDialog
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            userId={user.id}
            currentDisplayName={profile?.display_name ?? null}
            currentAvatarColor={profile?.avatar_color ?? "#C8B89A"}
            currentAvatarUrl={profile?.avatar_url ?? null}
            avatarInitial={avatarInitial}
            onSaved={() => refreshProfile()}
          />
          <DeleteAccountDialog
            open={deleteAccountOpen}
            onOpenChange={setDeleteAccountOpen}
            userEmail={user.email ?? ""}
          />
        </>
      )}
    </div>
  );
});

Layout.displayName = "Layout";

export default Layout;
