import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <PageSkeleton />
    </div>
  );
}
