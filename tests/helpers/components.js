'use strict';
// Every prop the renderer gives a <discord-*> element is serialised as an HTML
// attribute. A Lit component only reacts to the attributes it declares — HTML
// lowercases names, so a camelCase prop such as `roleColor` arrives as `rolecolor`
// and is ignored — and it converts each value by its declared type: a count of
// "1.5K" becomes NaN, `bot="false"` still means true. Reply role colors, embed
// footer icons, audio file sizes and large reaction counts were all lost that way.
// This checks rendered markup against the component manifest of the installed
// package, custom-elements.json.
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_DIR = path.join(path.dirname(require.resolve('@skyra/discord-components-core')), '..');
const INSTALLED_VERSION = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8')).version;

// Attributes every element understands, plus the ones this library's own CSS and
// scripts read (data-*, aria-*).
const GLOBAL_ATTRIBUTES = new Set(['id', 'class', 'style', 'title', 'slot', 'role', 'tabindex', 'hidden', 'lang', 'dir']);

/** A value check for a declared attribute type; null means the value is fine. */
function valueCheck(typeText) {
    const parts = String(typeText ?? '').split('|').map((part) => part.trim())
        .filter((part) => part && part !== 'undefined' && part !== 'null');
    if (parts.length === 1 && parts[0] === 'boolean') {
        return (value) => (value === '' ? null : 'a boolean attribute is true by its presence alone');
    }
    if (parts.length === 1 && parts[0] === 'number') {
        return (value) => (Number.isFinite(Number(value)) ? null : 'the component reads it as a number');
    }
    if (parts.length > 0 && parts.every((part) => /^'[^']*'$/.test(part))) {
        const allowed = parts.map((part) => part.slice(1, -1));
        return (value) => (allowed.includes(value) ? null : `not one of ${allowed.join(', ')}`);
    }
    return () => null;
}

let cache = null;

/** Map of tag name → Map of attribute name → value check. */
function componentAttributes() {
    if (cache) return cache;
    const manifest = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'custom-elements.json'), 'utf8'));
    const map = new Map();
    for (const declaration of manifest.modules.flatMap((module) => module.declarations ?? [])) {
        if (!declaration.tagName) continue;
        map.set(declaration.tagName, new Map((declaration.attributes ?? []).map((attribute) => [attribute.name, valueCheck(attribute.type?.text)])));
    }
    // A layout change in the package must not turn this into a check that passes
    // because it found nothing to compare against.
    if (map.size < 40 || !map.get('discord-reply')?.has('role-color') || !map.get('discord-reaction')?.has('count')) {
        throw new Error(`could not read the component manifest in ${PACKAGE_DIR} (found ${map.size} components)`);
    }
    cache = map;
    return map;
}

const ENTITIES = { amp: '&', quot: '"', lt: '<', gt: '>', '#x27': "'", '#39': "'" };
const decode = (value) => value.replace(/&(amp|quot|lt|gt|#x27|#39);/g, (_, name) => ENTITIES[name]);

/** Every attribute on a <discord-*> element in `html` that its component would not read as intended. */
function attributeProblems(html) {
    const components = componentAttributes();
    const problems = new Set();
    for (const [, tag, attributeList] of html.matchAll(/<(discord-[a-z-]+)\b([^>]*)>/g)) {
        const declared = components.get(tag);
        if (!declared) {
            problems.add(`<${tag}> is not a component of @skyra/discord-components-core`);
            continue;
        }
        for (const [, name, value = ''] of attributeList.matchAll(/\s([^\s=>"'/]+)(?:="([^"]*)")?/g)) {
            // Compare what the browser will see: the lowercased name.
            const parsed = name.toLowerCase();
            if (GLOBAL_ATTRIBUTES.has(parsed) || parsed.startsWith('data-') || parsed.startsWith('aria-')) continue;
            const check = declared.get(parsed);
            if (!check) {
                problems.add(`<${tag}> ${name} is not an attribute of the component`);
                continue;
            }
            const error = check(decode(value));
            if (error) problems.add(`<${tag}> ${name}="${value}": ${error}`);
        }
    }
    return [...problems];
}

module.exports = { attributeProblems, componentAttributes, INSTALLED_VERSION };
