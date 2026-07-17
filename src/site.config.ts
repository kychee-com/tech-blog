import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	// Canonical production origin. Also the base for RSS, sitemap and OG URLs.
	// NOTE: `blog.run402.com` is a platform-reserved subdomain (not yet claimable
	// by a tenant — see DESIGN.md). The site currently serves at
	// `tech-blog.run402.com`, so that is the canonical origin until an operator
	// releases `blog`. Flip this back to `https://blog.run402.com/` at that point.
	url: "https://tech-blog.run402.com/",
	title: "Run402 Blog",
	author: "Run402",
	description: "Agent-native programming, infrastructure, and software design from Run402.",
	lang: "en",
	ogLocale: "en_US",
	showLogo: true,
	date: {
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
};

// Primary navigation, used by the header and footer.
// External links carry an explicit `external` flag so the header can annotate them.
export const menuLinks: { path: string; title: string; external?: boolean }[] = [
	{ path: "/posts/", title: "Articles" },
	{ path: "/roadmap/", title: "Roadmap" },
	{ path: "/about/", title: "About" },
	{ path: "https://run402.com", title: "run402.com", external: true },
];

// https://expressive-code.com/reference/configuration/
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "6px",
		codeFontFamily:
			'ui-monospace, "JetBrains Mono", "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
		codeFontSize: "0.85rem",
		codeLineHeight: "1.7",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
		},
		uiLineHeight: "inherit",
	},
	themeCssSelector(theme, { styleVariants }) {
		// Emit [data-theme='light'] / [data-theme='dark'] selectors that match
		// the site's own theme switch (one dark + one light theme configured).
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme;
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
		}
		return `[data-theme="${theme.name}"]`;
	},
	// One dark (native Run402 terminal feel), one light (intentional, not inverted).
	themes: ["night-owl", "github-light"],
	useThemedScrollbars: false,
};
