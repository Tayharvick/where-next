# Where Next

A relocation scout. Real towns, honest downsides, and whether you're early or too late.

Zillow tells you what's for sale. This tells you whether you should want it.

---

## What it does

- **Three states are already researched** — Florida, Nevada, Montana. 16 towns, real 2026 data.
- **The other 47 research themselves.** Tap a grey state, hit "Research", and the site goes and finds five towns — live web search, real prices, real employers, the hidden carrying cost, the honest downsides. Takes a minute or two.
- **Every town gets a timing tag**: still early / heating up / priced in. That's the product.

---

## Getting it online (about 30 minutes, from a laptop)

You need three free accounts: GitHub, Vercel, and Anthropic (for the API key).

### 1. Get an API key

Go to **console.anthropic.com** → API Keys → Create Key. Copy it.

> This is **not** your Claude subscription. It's a separate pay-as-you-go account. Put $5 on it. Researching a state costs a few cents.

### 2. Run it on your laptop first

Install Node.js from **nodejs.org** (take the LTS version). Then, in this folder:

```bash
npm install
```

Make a file called `.env.local` with one line in it:

```
ANTHROPIC_API_KEY=sk-ant-paste-your-key-here
```

Then:

```bash
npm run dev
```

Open **http://localhost:3000**. Try tapping a grey state and researching it. If that works, you're done with the hard part.

### 3. Put it on the internet

```bash
git init
git add .
git commit -m "Where Next"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/where-next.git
git push -u origin main
```

Then go to **vercel.com** → sign in with GitHub → **Add New Project** → pick the repo.

**Before you hit Deploy**, open *Environment Variables* and add:

- Name: `ANTHROPIC_API_KEY`
- Value: your key

Now hit Deploy. You get a live URL in about a minute.

> If you skip the environment variable, the site still works — but researching new states will fail. That's the one thing that needs the key.

Your own domain (`wherenext.com`, ~$12/yr) goes in Project → Settings → Domains.

---

## How researched states become permanent

Right now, when someone researches Ohio, it's saved **in their browser only**. The next visitor starts from scratch.

To make a state permanent for everyone:

1. Research it.
2. Scroll to the bottom, hit **Copy this state as JSON**.
3. **Read it.** Check the numbers. This is the step that matters.
4. Paste it into the `STATES` object in `lib/data.js`.
5. `git push`. Vercel redeploys itself.

That two-step — machine drafts, human checks, then it becomes canon — is the whole quality control system. Don't skip step 3.

### If you want it to save automatically for everyone

You'd add a database (Vercel KV is free to start). Worth doing once people are actually using it. Not worth doing before then.

---

## The five rules

These are what keep it from decaying into a listicle. They're baked into the research prompt in `app/api/research/route.js`.

1. **Every town gets a "watch out".** If you can't name what's wrong with a place, you haven't researched it.
2. **Never fake a number.** No clean median → `verified: false`, and the app admits it on screen.
3. **The timing tag is the product.** Cheap-and-rising and cheap-and-dying look identical on a listings site.
4. **No crime stats.** Reputable sources reach opposite conclusions from the same FBI data — one graded a town A− for safety while another called it unsafe. A number two good sources disagree about isn't information.
5. **No demographic targeting.** Median age and income, fine. Racial composition, never — that's steering, and it's what fair housing law exists to prevent.

---

## Where the files are

```
lib/data.js                  ← all the town data. Start here.
app/api/research/route.js    ← the live research. The research prompt lives here.
components/WhereNext.jsx     ← the interface
app/page.js, app/layout.js   ← the page wrapper
```

## If it ever gets real

The numbers can be automated. The judgment can't — and the judgment is the business.

- **Prices / growth** → Zillow Research (free CSVs), Redfin Data Center
- **Population / income** → Census ACS API (free)
- **Employers / wages** → BLS
- **Fire, flood, heat** → FEMA National Risk Index, First Street
- **Listings** → currently deep-links out. A real feed means an MLS/IDX license, which means a brokerage relationship. Don't scrape — it's against their terms and they enforce it.

Anyone can pull those numbers. Nobody bothers to write the catch. That's the moat.
