interface UserAvatarProps {
  avatarUrl?: string | null;
  avatarColor?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
}

export default function UserAvatar({
  avatarUrl,
  avatarColor,
  displayName,
  email,
  size = 36,
}: UserAvatarProps) {
  const initial = (displayName?.[0] || email?.[0] || "?").toUpperCase();
  const bg = avatarColor || "#C8B89A";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Profile"
        className="flex-shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1.5px solid hsl(var(--border))",
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 font-heading font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        color: "hsl(var(--bg))",
        fontSize: size * 0.4,
        border: "1.5px solid hsl(var(--border))",
      }}
    >
      {initial}
    </div>
  );
}
