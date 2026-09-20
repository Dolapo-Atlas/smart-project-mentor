import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, guideJsonLd } from "@/components/toolkit/guide-page";
import { guideBySlug } from "@/lib/toolkit/content";

const guide = guideBySlug("project-status-report")!;

export const Route = createFileRoute("/toolkit/project-status-report")({
  head: () => ({
    meta: [
      { title: guide.title },
      { name: "description", content: guide.metaDescription },
      { property: "og:title", content: guide.title },
      { property: "og:description", content: guide.metaDescription },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{ type: "application/ld+json", children: guideJsonLd(guide) }],
  }),
  component: () => <GuidePage guide={guide} />,
});
