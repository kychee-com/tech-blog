#!/usr/bin/env node
/**
 * Turn the static Astro build (dist/) into a Run402 ReleaseSpec `site` slice and
 * print it as JSON on stdout.
 *
 * Why this exists: keyless CI deploys go through `run402 deploy apply`, which is
 * the command that exchanges the GitHub OIDC token for a Run402 CI session. That
 * command wants a ReleaseSpec — its `--dir` shortcut is specifically for
 * `@run402/astro` *preset* builds (an adapter tree under dist/run402/client),
 * which a plain-static build is not. So we hand it an explicit `site` slice: one
 * base64-encoded entry per file, implicit public paths (index.html → /,
 * about/index.html → /about/, rss.xml → /rss.xml, …).
 *
 * The whole site is inlined; it must stay under Run402's 5 MB CI inline-spec cap
 * (this blog is ~1.5 MB base64 — fine). If it ever grows past that, switch to a
 * CAS-upload deploy path.
 *
 * Usage:  node scripts/build-release-spec.mjs [distDir] > spec.json
 *         RUN402_PROJECT_ID is embedded when set (CLI --project also works).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const distDir = process.argv[2] || "dist";

const CONTENT_TYPES = {
	html: "text/html; charset=utf-8",
	css: "text/css; charset=utf-8",
	js: "text/javascript; charset=utf-8",
	mjs: "text/javascript; charset=utf-8",
	json: "application/json",
	xml: "application/xml",
	txt: "text/plain; charset=utf-8",
	svg: "image/svg+xml",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	ico: "image/x-icon",
	webmanifest: "application/manifest+json",
	wasm: "application/wasm",
	woff: "font/woff",
	woff2: "font/woff2",
	ttf: "font/ttf",
};

function contentTypeFor(path) {
	const ext = path.split(".").pop().toLowerCase();
	return CONTENT_TYPES[ext] || "application/octet-stream";
}

function walk(dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (statSync(full).isFile()) out.push(full);
	}
	return out;
}

const replace = {};
for (const file of walk(distDir)) {
	const key = relative(distDir, file).split(sep).join("/");
	const bytes = readFileSync(file);
	replace[key] = {
		data: bytes.toString("base64"),
		encoding: "base64",
		contentType: contentTypeFor(key),
	};
}

if (!replace["index.html"]) {
	console.error(`error: ${distDir}/index.html not found — did the build run?`);
	process.exit(1);
}

const spec = {
	...(process.env.RUN402_PROJECT_ID ? { project_id: process.env.RUN402_PROJECT_ID } : {}),
	site: { replace, public_paths: { mode: "implicit" } },
};

process.stdout.write(JSON.stringify(spec));
