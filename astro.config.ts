import fs from "node:fs";
import { satteri, satteriHeadingIdsPlugin } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import webmanifest from "astro-webmanifest";
import { satteriAdmonitionsPlugin } from "./src/plugins/admonitions";
import { satteriGithubCardPlugin } from "./src/plugins/github-cards";
import {
	satteriAutolinkHeadingsPlugin,
	satteriExternalLinksPlugin,
	satteriFootnoteLabelPlugin,
	satteriReadingTimePlugin,
	satteriUnwrapImagesPlugin,
} from "./src/plugins/satteri";
import { expressiveCodeOptions, siteConfig } from "./src/site.config";

// Static output today. This site is intentionally SSR-ready: swapping to
// Run402's Astro SSR runtime is a documented one-line change — see DESIGN.md
// (`Going SSR`). We stay `output: 'static'` now because the blog has no dynamic
// routes and a credential-free `npm run build` is the right default for step 1.
// https://astro.build/config
export default defineConfig({
	site: siteConfig.url,
	integrations: [
		expressiveCode(expressiveCodeOptions),
		icon(),
		sitemap(),
		mdx(),
		robotsTxt(),
		webmanifest({
			name: siteConfig.title,
			short_name: "Run402 Blog",
			description: siteConfig.description,
			lang: siteConfig.lang,
			icon: "public/icon.svg", // source for generated favicon & icons
			icons: [
				{ src: "icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
				{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
				{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
			],
			start_url: "/",
			background_color: "#0a0a0f",
			theme_color: "#0a0a0f",
			display: "standalone",
			config: {
				insertFaviconLinks: false,
				insertThemeColorMeta: false,
				insertManifestLink: false,
			},
		}),
	],
	markdown: {
		processor: satteri({
			features: { directive: true },
			mdastPlugins: [
				satteriUnwrapImagesPlugin(),
				satteriReadingTimePlugin(),
				satteriGithubCardPlugin(),
				satteriAdmonitionsPlugin(),
			],
			hastPlugins: [
				satteriHeadingIdsPlugin(),
				satteriAutolinkHeadingsPlugin(),
				satteriFootnoteLabelPlugin(),
				satteriExternalLinksPlugin(),
			],
		}),
	},
	vite: {
		plugins: [tailwind(), rawFonts([".ttf", ".woff"])],
	},
});

function rawFonts(ext: string[]) {
	return {
		name: "vite-plugin-raw-fonts",
		// @ts-expect-error:next-line
		transform(_, id) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return {
					code: `export default ${JSON.stringify(buffer)}`,
					map: null,
					moduleType: "js",
				};
			}
		},
	};
}
