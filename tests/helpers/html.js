'use strict';
// Helpers for tests that render a transcript from real discord.js objects and look
// at the markup it produces.
process.env.TZ = 'UTC';
const assert = require('node:assert/strict');
const { generateFromMessages, ExportReturnType } = require('../../dist/index.js');
const { createWorld } = require('./world');

/**
 * Renders what `build` returns. `html` is the whole document, including the data
 * island in <head> that feeds the profile cards. `body` is the visible page without
 * React's `<!-- -->` text separators, which are a detail of the renderer, not output.
 */
async function render(t, build, options = {}) {
    const world = createWorld();
    t.after(() => world.destroy());
    const html = await generateFromMessages(build(world), world.channel, { returnType: ExportReturnType.String, ...options });
    assert.ok(!html.includes('failed to render'), 'a fixture message failed to render');
    const body = html.slice(html.indexOf('<body')).replace(/<!-- -->/g, '');
    const data = JSON.parse(html.match(/<script id="dht-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    return { html, body, data };
}

/** The attributes of every `<tag>` in `html`, in document order; names lowercased as HTML parses them. */
function tags(html, tag) {
    return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(([, list]) => new Map(
        [...list.matchAll(/\s([^\s=>"'/]+)(?:="([^"]*)")?/g)].map(([, name, value = '']) => [name.toLowerCase(), value]),
    ));
}

module.exports = { render, tags };
