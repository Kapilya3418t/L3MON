const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios'); // Ensure you run: npm install axios

// --- GITHUB SYNC CONFIGURATION ---
const token = process.env.GH_TOKEN; // Set this in Render Env Vars
const repo = process.env.GH_REPO;   // Format: username/repo-name
const dbPath = path.join(__dirname, 'maindb.json'); 
const url = `https://api.github.com/repos/${repo}/contents/maindb.json`;

/**
 * Downloads the database from your private GitHub repo at startup.
 */
async function restoreFromGithub() {
    if (!token || !repo) {
        console.log("⚠️ GH_TOKEN or GH_REPO not set. Skipping restore.");
        return;
    }
    try {
        console.log("🔄 Restoring database from GitHub...");
        const res = await axios.get(url, {
            headers: { Authorization: `token ${token}` }
        });
        const content = Buffer.from(res.data.content, 'base64').toString('utf8');
        fs.writeFileSync(dbPath, content);
        console.log("✅ Database successfully restored.");
    } catch (err) {
        console.log("ℹ️ No remote database found or error occurred. Starting fresh.");
    }
}

/**
 * Uploads the local maindb.json back to GitHub.
 */
async function backupToGithub() {
    if (!token || !repo || !fs.existsSync(dbPath)) return;
    try {
        const content = fs.readFileSync(dbPath, 'utf8');
        const base64Content = Buffer.from(content).toString('base64');

        // GitHub requires the current file's SHA to perform an update
        let sha = "";
        try {
            const res = await axios.get(url, { headers: { Authorization: `token ${token}` } });
            sha = res.data.sha;
        } catch (e) { /* File might be new */ }

        await axios.put(url, {
            message: `L3MON Auto-Backup ${new Date().toISOString()}`,
            content: base64Content,
            sha: sha
        }, { headers: { Authorization: `token ${token}` } });

        console.log("☁️ Database backed up to GitHub.");
    } catch (err) {
        console.error("❌ Backup failed:", err.message);
    }
}

// --- MAIN SERVER LOGIC ---
const serverPath = path.join(__dirname, 'server', 'init.js');

const startServer = () => {
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: __dirname
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  server.on('exit', (code) => {
    code === 0
      ? console.log('Server stopped.')
      : console.error(`Server exited with code ${code}`);
    process.exit(code);
  });

  const shutdown = (signal) => {
    console.log(`Shutting down (${signal})...`);
    // Final backup attempt before shutdown
    backupToGithub().finally(() => {
        server.kill(signal);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// --- INITIALIZATION ---
// 1. Restore data -> 2. Start Server -> 3. Start Sync Interval
restoreFromGithub().then(() => {
    startServer();
    // Run backup every 5 minutes as requested
    setInterval(backupToGithub, 5 * 60 * 1000);
});
