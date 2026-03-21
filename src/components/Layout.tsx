import React, { useState, useRef, useEffect, forwardRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, LayoutGrid, ShoppingBag, Pencil, LogOut, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import EditProfileDialog from "@/components/EditProfileDialog";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
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
        <div className="w-full flex h-14 items-center justify-between px-8">
          <Link to="/" className="flex items-center">
            <span className="font-heading text-[1.25rem] tracking-[0.2em] uppercase text-accent">
              ROOMAI
            </span>
          </Link>

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
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="cursor-pointer"
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
                    style={{ width: 240 }}
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
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer"
                    >
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      My Rooms
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/orders"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      My Orders
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setEditProfileOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                      Edit Profile
                    </button>

                    <div className="border-b border-border" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-muted-foreground hover:bg-background hover:text-accent transition-colors border-b border-border text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      Sign Out
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setDeleteAccountOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 font-body text-[0.8rem] text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
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

            <button
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

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
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={profile?.avatar_url}
                      avatarColor={profile?.avatar_color}
                      displayName={profile?.display_name}
                      email={user.email}
                      size={28}
                    />
                    <span className="font-body text-[0.75rem] text-muted-foreground">{user.email}</span>
                  </div>
                  <button
                    onClick={() => { setMobileOpen(false); setEditProfileOpen(true); }}
                    className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-muted-foreground text-left"
                  >
                    Edit Profile
                  </button>
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
