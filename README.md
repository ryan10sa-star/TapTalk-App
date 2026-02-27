# TapTalk-App
A mostly offline PWA to help with non verbal communications and learning

---

## ✅ How to go live — step by step

Merging this Pull Request puts all the app files onto `main`.
GitHub Pages is already watching `main`, so the app will be live within ~1 minute at:

**https://ryan10sa-star.github.io/TapTalk-App/**

### Step 1 — Approve the PR (if you see "Review required")

Because this PR was opened by the Copilot bot you need to approve it once as the repo owner:

1. Scroll to the bottom of this PR page on GitHub.
2. Click the **"Add your review"** button (or **"Review changes"** — same thing).
3. Select **✅ Approve**.
4. Click **"Submit review"**.

That's it — you don't have to write anything in the comment box.

### Step 2 — Merge

Once approved, click the green **"Merge pull request"** button, then **"Confirm merge"**.

Done. Wait about 60 seconds and visit **https://ryan10sa-star.github.io/TapTalk-App/** —
the full AAC app will be there.

---

## Why it shows blank / just text right now

`main` currently only has a `README.md` file — all the app code lives on this PR branch.
GitHub Pages is serving from `main`, so it displays the README as plain text.
Merging this PR fixes that instantly.

---

## 🔗 Preview the app right now (no merge needed)

You can also try the app immediately at:

**https://raw.githack.com/ryan10sa-star/TapTalk-App/copilot/build-offline-first-pwa/index.html**

> Core features (AAC boards, choice board, offline storage) all work here.
> The "install as app" banner won't appear on this preview URL — use the GitHub Pages
> URL above (after merging) if you need that.

---

## 💻 Run locally

```bash
npm install
npm run dev       # starts a local dev server at http://localhost:5173
```
