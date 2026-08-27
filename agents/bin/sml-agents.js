#!/usr/bin/env node
/**
 * Self-Made Legends — agent CLI
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 *   sml-agents concept "<brief>" [--image path-or-url] [--live]
 *   sml-agents order <order.json> [--live]
 *   sml-agents stats [--since YYYY-MM-DD]
 *   sml-agents partners
 *
 * Stub mode is the default everywhere. Nothing calls the paid API, and
 * nothing reaches a real partner, unless --live is passed. That default is
 * deliberate: the expensive mistakes in this system are all made by
 * something running when the operator thought it was not.
 */

'use strict';

const fs = require('fs');
const pipeline = require('../pipeline');
const events = require('../runtime/events');
const partners = require('../partners');

const argv = process.argv.slice(2);
const cmd = argv[0];

function flag(name) {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true);
}

if (!flag('live')) process.env.SML_AGENTS_STUB = '1';

const banner = () => {
  const live = process.env.SML_AGENTS_STUB !== '1';
  console.log(`\n  Self-Made Legends — agents  ${live ? '\x1b[33m[LIVE — this spends money]\x1b[0m' : '[stub mode — free]'}\n`);
};

async function main() {
  switch (cmd) {
    case 'concept': {
      const brief = argv[1];
      if (!brief || brief.startsWith('--')) return die('Give me a brief:\n  sml-agents concept "A heavyweight hoodie for Volume II"');
      banner();
      const image = flag('image');
      const result = await pipeline.concept(brief, { image: typeof image === 'string' ? image : undefined });
      report(result);
      break;
    }

    case 'order': {
      const file = argv[1];
      if (!file) return die('Give me an order file:\n  sml-agents order examples/order.json');
      banner();
      const order = JSON.parse(fs.readFileSync(file, 'utf8'));
      const result = await pipeline.order(order);
      const r = result.routing;
      if (r.route === null) {
        console.log(`  \x1b[31mUNROUTABLE\x1b[0m — ${r.unroutable_reason || 'no reason given'}`);
      } else {
        for (const s of r.route.shipments) {
          console.log(`  ${s.manufacturer} → ${s.distributor}  ${s.service_level}  ships ${s.estimated_ship_date || '?'}`);
        }
        if (r.route.shipments.length > 1) console.log(`  split: ${r.route.split_reason}`);
      }
      printFlags(r.flags);
      console.log(`\n  $${result.cost_usd.toFixed(4)}\n`);
      break;
    }

    case 'stats': {
      const s = events.summarise({ since: flag('since') || undefined });
      console.log(`\n  Events ${s.events}   Spend $${s.cost_usd.toFixed(4)}\n`);
      const rows = Object.entries(s.agents);
      if (!rows.length) { console.log('  Nothing recorded yet.\n'); break; }
      console.log('  agent      calls  err%   1st-pass  cache%   avg ms      cost');
      console.log('  ' + '─'.repeat(62));
      for (const [name, a] of rows) {
        const fp = a.first_pass_rate === null ? '    —' : (a.first_pass_rate * 100).toFixed(0).padStart(5) + '%';
        console.log(
          '  ' + name.padEnd(10) +
          String(a.calls).padStart(5) +
          (a.error_rate * 100).toFixed(0).padStart(6) + '%' +
          fp.padStart(10) +
          (a.cache_hit_rate * 100).toFixed(0).padStart(7) + '%' +
          String(a.avg_latency_ms).padStart(9) +
          ('$' + a.cost_usd.toFixed(4)).padStart(10)
        );
      }
      console.log('\n  1st-pass = approved with no edits, of everything a human reviewed.');
      console.log('  If it is not climbing week over week, the loop is not learning.\n');
      break;
    }

    case 'partners': {
      const state = await partners.partnerState();
      console.log('');
      for (const p of state) {
        const mark = p.available === false ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
        console.log(`  ${mark} ${p.id.padEnd(14)} ${p.name || ''} ${p.mock ? '\x1b[33m(mock)\x1b[0m' : ''}${p.sandbox ? '\x1b[33m(sandbox)\x1b[0m' : ''}`);
        if (p.unverified) console.log(`      \x1b[33m${p.unverified}\x1b[0m`);
        if (p.error) console.log(`      ${p.error}`);
      }
      console.log('');
      break;
    }

    default:
      console.log(`
  Self-Made Legends — agents

    concept "<brief>" [--image <path|url>]   run a brief through design and tech pack
    order <file.json>                        route an order
    stats [--since YYYY-MM-DD]               what the agents have been doing
    partners                                 who is reachable and what they can do

  Add --live to use the real API. Without it everything runs on stubs,
  free, and nothing reaches a real partner.
`);
  }
}

function report(result) {
  for (const [stage, out] of Object.entries(result.stages)) {
    if (stage === 'factory') {
      const mark = out.accepted ? '\x1b[32m✓\x1b[0m' : '\x1b[33m⊘\x1b[0m';
      console.log(`  ${mark} factory    ${out.status}`);
      (out.questions || []).forEach((q) => console.log(`      ? ${q}`));
      continue;
    }
    const flags = out.flags || [];
    const blockers = flags.filter((f) => f.severity === 'blocker').length;
    const mark = blockers ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
    console.log(`  ${mark} ${stage.padEnd(10)} confidence ${(out.confidence ?? 0).toFixed(2)}`);
    printFlags(flags, '      ');
  }

  if (result.halted) {
    console.log(`\n  \x1b[31mHalted at ${result.halted.stage}.\x1b[0m Nothing downstream ran.`);
  }
  console.log(`\n  $${result.cost_usd.toFixed(4)}   run ${result.runId}`);
  console.log('  Review it:  node agents/review/server.js\n');
}

function printFlags(flags, indent = '  ') {
  const colour = { blocker: '\x1b[31m', warning: '\x1b[33m', note: '\x1b[90m' };
  for (const f of flags || []) {
    console.log(`${indent}${colour[f.severity] || ''}${f.severity}\x1b[0m: ${f.issue}`);
  }
}

function die(msg) { console.error('\n  ' + msg + '\n'); process.exit(1); }

main().catch((err) => { console.error('\n  \x1b[31m' + err.message + '\x1b[0m\n'); process.exit(1); });
