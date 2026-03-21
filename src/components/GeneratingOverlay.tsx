import { useState, useEffect, useRef } from "react";

const messages = [
  "Designing your room…",
  "Selecting furniture…",
  "Placing items…",
  "Adding finishing touches…",
  "Welcome home.",
];

export default function GeneratingOverlay() {
  const [step, setStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStep((prev) => (prev < messages.length - 1 ? prev + 1 : 0));
    }, 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-px bg-border">
        <div className="h-full bg-accent animate-progress-fill" />
      </div>

      {/* Message */}
      <p
        key={step}
        className="font-heading italic text-[1.5rem] font-light text-foreground tracking-[0.05em] text-center animate-message-fade"
      >
        {messages[step]}
      </p>
    </div>
  );
}
