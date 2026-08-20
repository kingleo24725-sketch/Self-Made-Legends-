# BOOTSTRAP — Creating the standalone `beauty-bond` repository

> **DAD + DAUGHTER BEAUTY BOND™ — A SELF-MADE LEGENDS LLC (SML) PRODUCT**
> © 2026 **Self-Made Legends LLC (SML)**. All rights reserved.
> Owner: **Self-Made Legends LLC (SML)** · Proprietary and confidential.

Beauty Bond ships from its **own repository**. This file is the one-time procedure to
move this project — the full `app/`, `backend/`, `infra/`, and `docs/` tree — out of
the `Self-Made-Legends-` repo and into `beauty-bond`, **preserving the full commit
history**.

> **Why this is a manual step:** the Claude GitHub App on this account does not have
> repository-creation permission (`POST /user/repos` → 403). Creating the empty repo
> takes about thirty seconds in the GitHub UI; everything after that is scripted below.

---

## Step 1 — Create the empty repository

On GitHub → **New repository**:

| Field | Value |
|---|---|
| Owner | `kingleo24725-sketch` (or the SML org, if one exists) |
| Name | `beauty-bond` |
| Visibility | **Private** — this is proprietary and confidential (`NOTICE.md` §6) |
| Initialize with README | **No** — leave it completely empty |
| .gitignore / license | **None** — provided below |

Creating it empty matters: an auto-generated README creates a root commit that
conflicts with the history being pushed in Step 2.

---

## Step 2 — Extract with history and push

Run from a clone of `Self-Made-Legends-`, on the branch holding this spec:

```bash
# 1. Fetch the branch that carries the specification
git fetch origin claude/beauty-bond-app-rebuild-u0c50c
git checkout claude/beauty-bond-app-rebuild-u0c50c

# 2. Split beauty-bond/ into its own history, with that directory as the root.
#    Every Beauty Bond commit is preserved; no Come Up history comes along.
git subtree split --prefix=beauty-bond -b beauty-bond-standalone

# 3. Push that history to the new repository's main branch
git push https://github.com/kingleo24725-sketch/beauty-bond.git \
    beauty-bond-standalone:main

# 4. Clone the new repo fresh and confirm
cd ..
git clone https://github.com/kingleo24725-sketch/beauty-bond.git
cd beauty-bond
ls          # app/ backend/ infra/ docs/ README.md NOTICE.md LICENSE
git log --oneline    # full Beauty Bond history, no Come Up commits
```

**Verified:** the `git subtree split` above has been run in this environment. It
places `app/`, `backend/`, `infra/`, `docs/`, and the root files at the repository
root, with every Beauty Bond commit intact and zero Come Up commits carried over.

---

## Step 3 — Clean up the Come Up repo

Once `beauty-bond` is confirmed good, remove the snapshot so there is exactly one
canonical copy and no drift:

```bash
git checkout claude/beauty-bond-app-rebuild-u0c50c
git rm -r beauty-bond
git commit -m "Move Beauty Bond spec to its own repository

Beauty Bond is a separate SML product and now lives at
github.com/kingleo24725-sketch/beauty-bond. Removing the snapshot so
there is one canonical copy."
git push
```

Leave a pointer in the Come Up `README.md` so nobody re-adds it:

```markdown
> **Note:** Beauty Bond™ is a separate SML product and is **not** part of this
> repository. It lives at `kingleo24725-sketch/beauty-bond`.
```

---

## Step 4 — Repository settings

| Setting | Value |
|---|---|
| Default branch | `main` |
| Branch protection | Require PR review on `main` before implementation starts |
| Secret scanning | **On** — the Stripe restricted key must never land in a commit |
| Push protection | **On** |
| Topics | `sml`, `beauty-bond`, `react-native`, `nodejs` |
| Description | `Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.` |

**Collaborators:** only people with an executed NDA (`NOTICE.md` §6).

---

## Step 5 — Before the first line of code

1. Run the safety suite first: `cd backend && npm install && npm run test:safety`.
   It must pass before any feature work. Then read
   [`docs/api-reference.md`](docs/api-reference.md) §6.3 for the layout.
2. Create Beauty Bond's **own Stripe account** and seed the catalogue:
   `cd backend && npm run seed:stripe -- --dry-run`, then without the flag.
   See [`docs/stripe-flow.md`](docs/stripe-flow.md) §3.2.
3. Add the SML source-file header (`NOTICE.md` §3.2) to the lint config so it is
   enforced rather than remembered.

---

## What must never happen

- Beauty Bond application code left in the `Self-Made-Legends-` repo after Step 3.
- Come Up code, SML Bucks, or game systems committed to `beauty-bond`.
- The two repos sharing a build, a dependency tree, a deploy, or a database.
- Beauty Bond billing through another SML product's Stripe account. It has its
  own (`docs/stripe-flow.md` §3.2).
