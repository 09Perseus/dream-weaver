const SkeletonCard = () => (
  <div className="border border-border bg-surface animate-skeleton-pulse">
    <div className="aspect-[4/3] bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-muted w-3/4" />
      <div className="h-3 bg-muted w-1/2" />
    </div>
  </div>
);

export default SkeletonCard;
