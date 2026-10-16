import { ProductCardSkeleton, Skeleton } from "@/components/ui/feedback";

export default function CatalogueLoading() {
  return (
    <div className="shell py-7 lg:py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-8">
        <div className="hidden space-y-4 lg:block">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div>
          <div className="flex items-center justify-between border-b border-line pb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
