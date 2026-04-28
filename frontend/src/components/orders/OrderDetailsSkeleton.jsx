export default function OrderDetailsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
}