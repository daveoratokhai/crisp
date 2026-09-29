import type { Metadata } from "next";
import { copy } from "@/content/site";
import { ExploreView } from "@/features/explore/explore-view";

export const metadata: Metadata = { title: copy.explore.title };

export default async function Page({ searchParams }: PageProps<"/">) {
  return <ExploreView raw={await searchParams} />;
}
