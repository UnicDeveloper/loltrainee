# LoLTrainee product site (GitHub Pages)

Static site for Riot Developer Portal **Product URL**.

## Publish

1. Create a public GitHub repo (suggested name: `loltrainee`).
2. Push this project (or at least the `docs/` folder) to `main`.
3. GitHub → **Settings** → **Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / folder: `/docs`
4. Wait ~1 minute, then open:
   - `https://<your-github-username>.github.io/loltrainee/`

Use that URL as **Product URL** in the Riot form.

## Local preview

Open `docs/index.html` in a browser, or:

```bash
npx --yes serve docs
```
