# Cvent MCP Server Setup & Deployment

This is an MCP (Model Context Protocol) server that connects Cvent to Claude, enabling you to manage campaigns, invites, attendees, and performance data.

## What This Does

The server exposes 5 tools in Claude:
1. **Create Campaign** - Create a new campaign for a forum/event
2. **Send Campaign Invites** - Send invitations to email addresses
3. **Get Attendees** - Retrieve registration/attendee list for an event
4. **Update Attendee Status** - Change attendee status (Confirmed, Cancelled, etc.)
5. **Get Campaign Performance** - View opens, clicks, and other metrics

---

## Deployment Options

### Option A: Deploy to Vercel (Recommended - Free & Easy)

**Prerequisites:**
- GitHub account
- Vercel account (sign up at vercel.com)

**Steps:**

1. **Create a GitHub repo:**
   - Go to github.com/new
   - Name it `cvent-mcp-server`
   - Upload these files:
     - `cvent-mcp-server.js`
     - `package.json`
     - `.env.example` (see below)

2. **Create `.env.example`:**
   ```
   CVENT_CLIENT_ID=your_client_id_here
   CVENT_CLIENT_SECRET=your_client_secret_here
   ```

3. **Deploy to Vercel:**
   - Go to vercel.com/new
   - Select "Import Git Repository"
   - Choose your `cvent-mcp-server` repo
   - Click "Deploy"
   - After deployment, go to **Settings > Environment Variables**
   - Add:
     - `CVENT_CLIENT_ID` = [your Cvent Client ID]
     - `CVENT_CLIENT_SECRET` = [your Cvent Client Secret]
   - Click "Redeploy"

4. **Your MCP URL:**
   ```
   https://your-vercel-app-name.vercel.app
   ```
   (Copy this)

---

### Option B: Deploy to Railway (Alternative)

1. Go to railway.app
2. Click "New Project" > "GitHub Repo"
3. Connect your GitHub repo
4. Go to **Variables** and add:
   - `CVENT_CLIENT_ID`
   - `CVENT_CLIENT_SECRET`
5. Deploy
6. Copy the generated URL

---

### Option C: Run Locally (Testing Only)

```bash
# Install dependencies
npm install

# Run with your credentials
CVENT_CLIENT_ID=your_id CVENT_CLIENT_SECRET=your_secret node cvent-mcp-server.js
```

---

## Add to Claude

Once deployed:

1. **In your coworker's Claude**, go to **Settings > Connectors**
2. Click **"+ Add custom connector"**
3. Fill in:
   - **Name:** `Cvent`
   - **Remote MCP server URL:** `https://your-vercel-app.vercel.app`
   - **Advanced settings:**
     - **OAuth Client ID:** [Your Cvent Client ID]
     - **OAuth Client Secret:** [Your Cvent Client Secret]
4. Click **Connect**
5. Done! Cvent tools are now available in Claude

---

## Finding Your Event & Campaign IDs

When using the tools, you'll need:
- **Event ID:** Go to your event in Cvent → Look at the URL or event details
- **Campaign ID:** Go to the campaign → Check the URL (usually in the format `/campaigns/xxxxx`)

---

## Troubleshooting

**"Connection failed":**
- Check that your Client ID and Secret are correct
- Verify the MCP URL is live (test in browser)

**"API error":**
- Make sure your Cvent scopes include what you're trying to do
- Check event/campaign IDs are correct

**"No tools showing up":**
- Reload Claude
- Check the connector is connected (green dot in Settings)

---

## Updating the Server

To add more features or fix bugs:
1. Update `cvent-mcp-server.js`
2. Push to GitHub
3. Vercel auto-redeploys
4. (No action needed in Claude)

---

## Support

For Cvent API issues, check: https://developers.cvent.com/docs/rest-api
