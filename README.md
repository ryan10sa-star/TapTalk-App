# TapTalk-App
A mostly offline PWA to help with non verbal communications and learning

## 🔗 View the dev preview — no setup required

Open this URL in your browser right now (no account, no publishing needed):

**https://raw.githack.com/ryan10sa-star/TapTalk-App/copilot/build-offline-first-pwa/index.html**

> **Note:** this URL points to the current `copilot/build-offline-first-pwa` branch.
> After merging to `main`, use `…/main/index.html` instead.

> raw.githack.com serves the files directly from this GitHub branch with the correct
> content-types. Core features (AAC boards, IndexedDB storage, offline mode) all work.
> The service worker is disabled on this CDN origin, so the "install as app" banner won't
> appear — use the GitHub Pages URL below if you need that.

---

### 🚀 Permanent GitHub Pages URL (one-time setup)

**Step 1 — Set the Pages source (do this once):**

1. In your repo go to **Settings → Pages → Build and deployment**
2. Set **Source** → **Deploy from a branch**
3. **Branch** dropdown → select **`copilot/build-offline-first-pwa`**, folder **`/ (root)`**
4. Click **Save**

> ℹ️ If the Save button is greyed out, the branch is already selected — GitHub Pages will
> build automatically within ~1 minute.  Refresh the page and a green banner with your
> live URL will appear at the top of the Pages settings screen.

**Step 2 — your live URL:**

**https://ryan10sa-star.github.io/TapTalk-App/**

---

#### After merging this PR to `main`

Once the PR is merged, repeat Step 1 and change the branch from
`copilot/build-offline-first-pwa` to **`main`** so future updates deploy automatically.

---

### 💻 Run locally

```bash
npm install
npm run dev       # starts a local dev server at http://localhost:5173
```
