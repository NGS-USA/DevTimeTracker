# DevTrack — Setup Guide

A time tracker for developers built with React, Vite, Vercel, and Baserow.

---

## Step 1 — Set up Baserow

### 1.1 Create an account
Go to https://baserow.io and sign up for a free account.

### 1.2 Create a new database
1. Click **Create new** on your dashboard
2. Select **Database**
3. Name it `DevTrack`

### 1.3 Create the Clients table
1. You'll see a default empty table — rename it to `Clients`
2. Delete any default fields that aren't needed
3. Make sure you have exactly this one field:

| Field Name | Type        |
|------------|-------------|
| Name       | Single line text |

### 1.4 Create the Projects table
1. Click **+ Add a table** (bottom of the left sidebar)
2. Name it `Projects`
3. Create these fields:

| Field Name | Type             |
|------------|------------------|
| Name       | Single line text |
| ClientID   | Single line text |

> ⚠️ Field names are case-sensitive. Type them exactly as shown.

### 1.5 Create the Sessions table
1. Click **+ Add a table** again
2. Name it `Sessions`
3. Create these fields:

| Field Name | Type             |
|------------|------------------|
| ProjectID  | Single line text |
| ClientID   | Single line text |
| StartTime  | Single line text |
| EndTime    | Single line text |
| Duration   | Number (set to integer format) |
| Note       | Long text        |

> For the Duration field: after creating it, click the field settings and set the format to **Integer** (no decimals).

### 1.6 Get your Table IDs
For each table (Clients, Projects, Sessions):
1. Click on the table so it's open and selected
2. Look at the URL in your browser — it will look like:
   `https://baserow.io/database/12345/table/67890`
3. The number after `/table/` is the **Table ID** — write it down

### 1.7 Get your API Token
1. Click your profile icon in the bottom-left corner
2. Click **Settings**
3. Click **API Tokens** in the left menu
4. Click **Create Token**
5. Give it a name (e.g. `DevTrack`)
6. Copy the token — you'll need it in a moment

---

## Step 2 — Set up the project locally

### 2.1 Install Node.js
If you don't have Node.js, download and install it from https://nodejs.org
Choose the **LTS** version.

### 2.2 Install the Vercel CLI
Open a terminal and run:
```
npm install -g vercel
```

### 2.3 Extract and open the project
1. Unzip the `devtrack.zip` file
2. Open a terminal inside the `devtrack` folder
3. Run:
```
npm install
```

### 2.4 Create your local environment file
1. Make a copy of `.env.example` and name it `.env.local`
2. Open `.env.local` and fill in your values:

```
BASEROW_TOKEN=paste_your_token_here
BASEROW_CLIENTS_TABLE_ID=paste_clients_table_id_here
BASEROW_PROJECTS_TABLE_ID=paste_projects_table_id_here
BASEROW_SESSIONS_TABLE_ID=paste_sessions_table_id_here
```

### 2.5 Run locally
```
npm run dev
```
This uses `vercel dev` which runs both the frontend and API routes together.
Open http://localhost:3000 in your browser.

---

## Step 3 — Deploy to Vercel

### 3.1 Log in to Vercel
In your terminal, run:
```
vercel login
```
Follow the prompts to log in with your email or GitHub.

### 3.2 Deploy
In the `devtrack` folder, run:
```
vercel
```
- When asked about the project settings, press Enter to accept the defaults
- When it finishes, it will give you a live URL like `https://devtrack-xxx.vercel.app`

### 3.3 Add environment variables to Vercel
Your `.env.local` file is not uploaded to Vercel (this is intentional for security). 
You need to add the variables in the Vercel dashboard:

1. Go to https://vercel.com and open your project
2. Click **Settings** → **Environment Variables**
3. Add each of these four variables one at a time:
   - `BASEROW_TOKEN`
   - `BASEROW_CLIENTS_TABLE_ID`
   - `BASEROW_PROJECTS_TABLE_ID`
   - `BASEROW_SESSIONS_TABLE_ID`
4. Set the value for each one and make sure **Production**, **Preview**, and **Development** are all checked
5. Click **Save**

### 3.4 Redeploy
After adding the environment variables, redeploy so they take effect:
```
vercel --prod
```

Your app is now live! Visit the URL Vercel gave you.

---

## How to use the app

1. Click **+ Client** to add your first client
2. Select the client from the dropdown, then click **+ Project** to add a project
3. Select the project, then hit **Start** to begin tracking time
4. Click **Stop** when done, add an optional note, and click **Log Session**
5. Use **↓ Export Project** or **↓ Export Client** for PDF reports (requires pop-ups allowed)

---

## Troubleshooting

**"Connection Error" on load**
- Check that your environment variables are set correctly in `.env.local` (local) or Vercel dashboard (production)
- Make sure your Baserow API token is valid

**Sessions not loading / 400 errors**
- Double-check your table field names match exactly (case-sensitive): `Name`, `ClientID`, `ProjectID`, `StartTime`, `EndTime`, `Duration`, `Note`

**PDF export doesn't open**
- Allow pop-ups for your site in your browser settings
