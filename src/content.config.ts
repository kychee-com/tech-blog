import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const post = defineCollection({
	// Content lives in Git as Markdown / MDX. This is the whole CMS.
	loader: glob({ base: "./src/content/post", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		z.object({
			// Required.
			title: z.string().max(80),
			description: z.string(),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),

			// Optional.
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			draft: z.boolean().default(false),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			pinned: z.boolean().default(false),
			series: z.string().optional(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			ogImage: z.string().optional(),

			// Future-facing seam: an article may later ship an open-source skill
			// that teaches coding agents to apply its principle. Optional today;
			// the renderer is deliberately deferred (see DESIGN.md).
			skill: z
				.object({
					name: z.string(),
					path: z.string(),
				})
				.optional(),
		}),
});

export const collections = { post };
