/**
 * template.json loading, validation and feature resolution.
 *
 * Shape:
 * {
 *   "name": "nest-api",
 *   "title": "NestJS API",
 *   "description": "...",
 *   "defaults": { "port": 5000 },
 *   "source": {                       // used by `stack extract` only
 *     "path": "~/Projects/inerds/web/backend",
 *     "include": ["src/common/**", ...],
 *     "exclude": ["src/portfolios/**", ...]
 *   },
 *   "replacements": [ { "from": "...", "to": "{{name}}" } ],
 *   "pathReplacements": [ { "from": "inerds", "to": "{{name}}" } ],
 *   "features": {
 *     "realtime": {
 *       "title": "Socket.IO realtime layer",
 *       "description": "...",
 *       "default": false,
 *       "core": false,                 // core features cannot be disabled
 *       "requires": ["cache"],
 *       "files": ["src/realtime/**"],  // deleted wholesale when off
 *       "packageJson": {
 *         "dependencies": ["socket.io", "@nestjs/websockets"],
 *         "devDependencies": [],
 *         "scripts": []
 *       },
 *       "env": ["REALTIME_PATH=/realtime"]
 *     }
 *   },
 *   "hooks": [ { "run": "yarn install", "when": "...", "optional": true } ]
 * }
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function expandHome(p) {
	if (!p) return p;
	return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

export function templatesDir(root) {
	return path.join(root, 'templates');
}

export function listTemplates(root) {
	const dir = templatesDir(root);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.filter((e) => fs.existsSync(path.join(dir, e.name, 'template.json')))
		.map((e) => e.name)
		.sort();
}

export function loadManifest(root, templateName) {
	const file = path.join(templatesDir(root), templateName, 'template.json');
	if (!fs.existsSync(file)) {
		const available = listTemplates(root);
		throw new Error(
			`Unknown template "${templateName}". Available: ${
				available.join(', ') || '(none)'
			}`
		);
	}
	const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
	manifest.__dir = path.join(templatesDir(root), templateName);
	manifest.__filesDir = path.join(manifest.__dir, 'files');
	manifest.features = manifest.features || {};
	return manifest;
}

/**
 * Resolve the enabled feature set from defaults + `--with` / `--without`.
 * Core features are always on. Requirements are pulled in transitively, and an
 * explicit `--without` of something another selected feature requires is a hard
 * error rather than a silently broken project.
 */
export function resolveFeatures(manifest, { with: withList = [], without = [], all = false }) {
	const features = manifest.features;
	const known = new Set(Object.keys(features));

	for (const name of [...withList, ...without]) {
		if (!known.has(name)) {
			throw new Error(
				`Unknown feature "${name}" for template "${manifest.name}". ` +
					`Known: ${[...known].sort().join(', ')}`
			);
		}
	}

	const enabled = new Set();
	for (const [name, def] of Object.entries(features)) {
		if (def.core || all || def.default) enabled.add(name);
	}
	for (const name of withList) enabled.add(name);
	for (const name of without) {
		if (features[name].core) {
			throw new Error(
				`Feature "${name}" is core to template "${manifest.name}" and cannot be removed.`
			);
		}
		enabled.delete(name);
	}

	// Transitively pull in requirements, then verify nothing explicitly removed
	// got dragged back in.
	const explicitlyOff = new Set(without);
	let grew = true;
	while (grew) {
		grew = false;
		for (const name of [...enabled]) {
			for (const dep of features[name].requires || []) {
				if (!known.has(dep)) {
					throw new Error(
						`Feature "${name}" requires "${dep}", which is not declared in template.json.`
					);
				}
				if (explicitlyOff.has(dep)) {
					throw new Error(
						`Cannot disable "${dep}": feature "${name}" requires it. ` +
							`Drop "${name}" too, or keep "${dep}".`
					);
				}
				if (!enabled.has(dep)) {
					enabled.add(dep);
					grew = true;
				}
			}
		}
	}

	return enabled;
}

export function featureSummary(manifest, enabled) {
	const on = [];
	const off = [];
	for (const [name, def] of Object.entries(manifest.features)) {
		(enabled.has(name) ? on : off).push({ name, ...def });
	}
	return { on, off };
}
