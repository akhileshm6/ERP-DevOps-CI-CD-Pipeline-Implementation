# Container Registry Retention Policy

**Owner:** Vivek Anand · **Plan item:** Week 7
**Implemented by:** `.github/workflows/registry-retention.yml`

## Policy

The pipeline publishes every build of `erp-server` and `erp-client` to the
GitHub Container Registry under an immutable tag equal to the commit SHA
(`ghcr.io/<owner>/erp-server:<sha>`), alongside a moving `:latest`. Retention
keeps the **20 most recent tagged versions of each image** — double the
ten-tag floor the rollback design calls for — and the workflow refuses to run
with a keep-count below 10, so the floor cannot be lowered by a careless
`workflow_dispatch` input. Untagged versions, which accumulate as superseded
layers on every rebuild, are pruned separately and never consume the
keep-window. `:latest` and any semantic-version tag are excluded from deletion
entirely. Pruning runs weekly at 03:30 UTC on Sundays and on demand. This
matters because rollback redeploys a **pinned image tag rather than rebuilding
from source**: the artefact must still be pullable at the moment it is needed.
Keeping twenty builds means a rollback can reach roughly a month of history at
this project's merge rate, so an incident discovered late — a regression that
only surfaces under Monday load, say — can still be reverted to a known-good
artefact instead of degrading into a rebuild-under-pressure. Without a floor,
GHCR's default behaviour of retaining everything eventually trips storage
quotas, and the usual reflex — deleting "old" images — is exactly what turns a
30-second rollback into an outage.

## **[BROWSER]** One-time setup you must do by hand

The workflow handles pruning, but two settings are not scriptable:

1. **Make the packages writable by Actions**
   `github.com/users/<owner>/packages/container/erp-server/settings`
   -> *Manage Actions access* -> add this repository with the **Write** role.
   Repeat for `erp-client`. Without this the prune job 403s.

2. **Confirm package visibility**
   Same settings page -> *Danger Zone* -> visibility. Private is fine; the
   deploy pulls with `GITHUB_TOKEN`.

There is **no** retention setting in the GitHub UI for GHCR — retention is
implemented only as the scheduled workflow above. Nothing to configure in a
dashboard beyond the two items listed.

## Verifying it works

Trigger manually once and read the summary:

```
Actions -> Registry Retention -> Run workflow -> keep = 20
```

Then list what survived:

```bash
gh api "/user/packages/container/erp-server/versions" \
  --jq '.[] | "\(.metadata.container.tags // ["<untagged>"] | join(",")) \(.created_at)"' \
  | head -25
```

Expect at most 20 tagged entries, `:latest` among them, newest first.

## Interaction with rollback

`rollback.yml` (Ayush) redeploys a pinned SHA tag. The contract between the two
is simply that **any SHA still reachable in deployment history must still exist
in GHCR**. If the deployment history table is ever allowed to grow past 20
entries, raise the keep-count here to match rather than trimming history.
