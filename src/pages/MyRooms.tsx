import { Link } from "react-router-dom";
import { Pencil, Trash2, Globe, GlobeLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockMyRooms } from "@/data/mockData";

export default function MyRooms() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex items-center justify-between mb-8 animate-reveal-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">My Rooms</h1>
          <p className="text-muted-foreground mt-1">Your saved room designs</p>
        </div>
        <Link to="/">
          <Button variant="amber">Create New Room</Button>
        </Link>
      </div>

      {mockMyRooms.length === 0 ? (
        <div className="text-center py-20 animate-reveal-up">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-1">No rooms yet</h3>
          <p className="text-muted-foreground mb-4">Create your first AI-designed room</p>
          <Link to="/">
            <Button variant="amber">Get Started</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockMyRooms.map((room, i) => (
            <div
              key={room.id}
              className="rounded-xl overflow-hidden bg-card border border-border/50 animate-reveal-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[16/10] bg-surface flex items-center justify-center">
                <div className="h-12 w-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center">
                  <svg className="h-6 w-6 text-amber/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-medium">{room.title}</h3>
                <div className="flex items-center gap-2">
                  <Link to={`/room/${room.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <Globe className="h-3.5 w-3.5" />
                    Post
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-auto">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
