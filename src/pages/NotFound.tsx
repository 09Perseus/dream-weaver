import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-[5rem] font-light tracking-[0.1em] text-foreground mb-4">404</h1>
        <p className="font-body text-[0.85rem] text-muted-foreground mb-6">Page not found</p>
        <a href="/" className="font-body text-[0.75rem] tracking-[0.1em] uppercase text-accent hover:underline">
          Return Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
