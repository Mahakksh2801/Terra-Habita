# Put Terra Habita online (free, private to you)

About 15 minutes. You'll use three free accounts: **Vercel** (runs the app), **Neon** (the database,
created from inside Vercel) and a **GitHub OAuth app** (lets you sign in with GitHub). Only the emails
you list in `ALLOWED_EMAILS` can ever sign in. Nobody else can create an account.

## 1. Merge the pull request
Merge the open pull request into `main` on GitHub. Vercel deploys whatever is on `main`.

## 2. Create the Vercel project
1. Go to <https://vercel.com/signup> and choose **Continue with GitHub** (Hobby plan, free).
2. Click **Add New… → Project**, find **terra-habita**, click **Import**, then **Deploy**.
   The first build fails because there is no database yet. That's expected.
3. Note your app's address, shown on the project page, e.g. `https://terra-habita-xyz.vercel.app`.
   Below it's called `YOUR_URL`.

## 3. Add the free database
1. In the project, open the **Storage** tab → **Create Database** → **Neon** (Serverless Postgres) → free plan.
2. Pick the region closest to you (e.g. US East), and connect it to the **terra-habita** project for all environments.
   This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.

## 4. Create the GitHub sign-in app
1. Go to <https://github.com/settings/applications/new>.
2. Fill in:
   - Application name: `Terra Habita`
   - Homepage URL: `YOUR_URL`
   - Authorization callback URL: `YOUR_URL/api/auth/callback/github`
3. Click **Register application**. Copy the **Client ID**, then click **Generate a new client secret** and copy it.

## 5. Add the settings
In Vercel: project → **Settings → Environment Variables**. Add these for **Production**:

| Name | Value |
|---|---|
| `AUTH_SECRET` | Any long random string. Get one at <https://generate-secret.vercel.app/32> |
| `AUTH_GITHUB_ID` | The Client ID from step 4 |
| `AUTH_GITHUB_SECRET` | The client secret from step 4 |
| `ALLOWED_EMAILS` | The **primary email of your GitHub account**. Separate several with commas. |

## 6. Deploy again
**Deployments** tab → the latest deployment → **⋯ → Redeploy**. The build creates the database tables.

## 7. Use it
- Open `YOUR_URL` on your laptop, click **Sign in → Continue with GitHub**.
- On your phone, open the same address and sign in the same way. To get an app icon:
  in Safari tap **Share → Add to Home Screen**, and in Chrome tap **⋮ → Add to Home screen**.
- Your timezone is picked up from your browser the first time. You can change it in **Settings**.

## Optional: sign in by email instead
Create a free account at <https://resend.com>, make an API key, and add it in Vercel as `AUTH_RESEND_KEY`.
On Resend's free plan without your own domain, emails can only go to the address you signed up with,
which is fine for a private app. Redeploy afterwards.

## If something goes wrong
- **"This Terra Habita is private"**: the email on your GitHub account doesn't match `ALLOWED_EMAILS`.
  Check your primary email at <https://github.com/settings/emails>.
- **GitHub says the redirect URI is wrong**: the callback URL in step 4 must be exactly `YOUR_URL/api/auth/callback/github`.
- **Build fails at "prisma migrate deploy"**: the Neon database isn't connected to the project yet (step 3).
