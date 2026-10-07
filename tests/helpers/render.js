'use strict';
// Renders a fixture scenario deterministically: UTC, a frozen clock, and every
// warning or error the renderer emits captured instead of printed.
process.env.TZ = 'UTC';
// React reports key and nesting mistakes through console.error in its development
// build only; NODE_ENV=production, common in containers, would silence that check.
process.env.NODE_ENV = 'development';
const { mock } = require('node:test');
const { createWorld, NOW } = require('./world');
const { scenarios } = require('../fixtures/scenarios');

const DEFAULT_IMPL = require.resolve('../../dist/index.js');
// Loaded up front, so nothing printed while it loads lands in the first scenario.
require(DEFAULT_IMPL);
const { clearInlineAssetCache } = require('../../dist/utils/selfContained.js');

// Node 20 and 22 announce the mocked clock as experimental through console.error the
// first time it is enabled. That is the test harness speaking, not the renderer.
const HARNESS_NOISE = /ExperimentalWarning: The MockTimers API is an experimental feature/;

try {
    mock.timers.enable({ apis: ['Date'], now: NOW.getTime() });
    mock.timers.reset();
}
catch (err) {
    throw new Error(`the golden tests need a mockable clock, which Node has from 20.11 on: ${err.message}`);
}

async function renderScenario(name, impl = DEFAULT_IMPL) {
    const lib = require(impl);
    const warnings = [];
    const errors = [];
    const originalWarn = console.warn;
    const originalError = console.error;
    let world = null;
    mock.timers.enable({ apis: ['Date'], now: NOW.getTime() });
    console.warn = (...args) => warnings.push(args.map(String).join(' '));
    console.error = (...args) => {
        const text = args.map(String).join(' ');
        if (!HARNESS_NOISE.test(text)) errors.push(text);
    };
    try {
        // Inside the try: a throwing fixture must not leave the clock frozen or the
        // console patched for every test that runs after it.
        world = createWorld();
        const { messages, options = {}, channel = world.channel, expectWarnings = [], setup, entry } = scenarios[name](world);
        const teardown = setup ? await setup(world) : null;
        try {
            const html = entry === 'createTranscript'
                ? await lib.createTranscript(channel, { returnType: 'string', ...options })
                : await lib.generateFromMessages(messages, channel, { returnType: 'string', ...options });
            return { html, warnings, errors, expectWarnings };
        }
        finally {
            if (teardown) await teardown();
        }
    }
    finally {
        console.warn = originalWarn;
        console.error = originalError;
        mock.timers.reset();
        // Downloads and failures are remembered per process; every scenario starts clean.
        clearInlineAssetCache();
        await world?.destroy();
    }
}

module.exports = { renderScenario, scenarios };
