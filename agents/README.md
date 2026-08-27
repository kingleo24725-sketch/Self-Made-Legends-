# SML agents

The design and order pipeline. Four agents running, six planned.

Full plan: [`docs/AGENT-ECOSYSTEM-PLAN.md`](../docs/AGENT-ECOSYSTEM-PLAN.md)

---

## Try it — no API key, no cost

```bash
npm run agents:partners
npm run agents:concept -- "A heavyweight hoodie for Volume II. Crest at the chest in gold."
npm run agents:review        # then open http://localhost:4100
npm run agents:eval
npm run agents:stats
```

Everything defaults to **stub mode**: nothing calls the paid API, nothing reaches
a real partner. Add `--live` to use the real thing.

---

## Going live

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run agents:concept -- "your brief" --live
```

Roughly **$0.37** per concept run. Twenty a month is about seven dollars.

**Never commit the key.** It is not in this repo and must not be.

---

## What is here

```
agents/
├── runtime/
│   ├── events.js       the event log — the whole point of the system
│   ├── registry.js     versioned prompts + approved examples
│   ├── client.js       one path every agent goes through
│   └── schemas.js      what each agent must return
├── prompts/
│   ├── brand.md        house rules, shared and cached by every agent
│   └── <agent>.v1.md   edit these to change behaviour
├── definitions/        model, effort, schema, stub output
├── partners/
│   ├── lefty.js        ⚠️ UNVERIFIED — mock by default
│   └── sandbox.js      a fake factory that refuses bad tech packs
├── review/             the human review UI
├── evals/              the gate that stops a bad prompt shipping
├── templates/          tech pack + QA checklist
└── pipeline.js         brief → design → tech pack → factory
```

---

## How it learns

1. An agent produces something. **Every call is logged.**
2. You open the review UI and approve, correct, or reject it.
3. Approved and corrected work becomes an example.
4. The next run carries those examples. A correction is labelled as a human fix,
   with your reason attached.

**A correction teaches far more than an approval,** because it encodes exactly
what was wrong. Rejected work is recorded but never shown to the agent — you do
not teach by showing bad work.

**If nobody reviews, nothing improves.** That is not a figure of speech; it is
the mechanism. The review backlog is the health of the system.

---

## Changing what an agent does

Edit `agents/prompts/<agent>.v1.md`. That is the whole procedure.

For a change you might want to undo, copy it to `.v2.md` and edit that — the
loader takes the highest version, and `.v1.md` stays as the rollback.

**Run `npm run agents:eval` before committing.** A prompt change can break
production as thoroughly as a code change, and it does it silently.

---

## Adding an eval

A check exists because getting it wrong costs money. When you find a mistake in
review, add the check that would have caught it — in `agents/evals/run.js` under
`CHECKS`, then name it in a golden case.

Assert on the **shape** of a good answer, never on exact wording. An eval that
fails on harmless rephrasing gets muted, and then protects nothing.

---

## Two things to know

**The system-block order in `runtime/client.js` is the caching strategy.** Brand
rules, then prompt, then examples, then the request input — stable content first,
because caching is a prefix match. Move the input above the examples and the
cache never hits, the bill is roughly ten times higher, and nothing looks broken.
Watch the cache hit rate in `agents:stats`; it should sit at 70–90%.

**The sandbox factory is deliberately awkward.** It refuses work it cannot do and
holds tech packs with unanswered questions, exactly as a real factory would. A
sandbox that always says yes teaches you nothing and hides every bug in your
error handling.

---

## The review UI has no authentication

It binds to `127.0.0.1` and is meant to run on your own machine. **Do not expose
it.** It writes to the example store, which steers every future output — anyone
who can reach it can change what your agents produce.

---

## The commerce API

`npm run agents:api` — takes designs and tech packs from the agents, takes
orders from the storefront, and hands each order to the **routing agent** to
decide where it goes.

```bash
export SML_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm run agents:api
```

It refuses to start without that key. Without one, anyone on the internet could
upload files to your server.

| Endpoint | |
|---|---|
| `POST /api/designs` | Design images + tech pack, keyed on SKU |
| `POST /api/orders` | Accepts and answers immediately; routing happens after |
| `GET /api/orders/:id` | Where an order actually is |
| `GET /api/orders?status=needs_human` | **The queue that must not grow** |
| `POST /api/orders/:id/shipped` | Requires a tracking number |

### Its own database, deliberately

`agents/data/sml-commerce.db` — **not** `sml.db`. That name belongs to the
trading game, and pointing this at it would create tables inside your players'
live database.

### Nothing is "shipped" without a tracking number

An order handed to a distributor is `at_manufacturer` or `at_distributor`. It
becomes `shipped` only when a carrier has it and there is a number to prove it.
A status that runs ahead of reality is how a customer gets told their parcel is
on the way when it does not exist.

### On Railway, the uploads directory needs a volume

Same problem as the game database: without a mounted volume every deploy wipes
`agents/data/`, including uploaded tech packs. Point `SML_API_DATA_DIR` at the
mount.
