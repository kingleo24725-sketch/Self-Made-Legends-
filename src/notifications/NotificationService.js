const nodemailer = require("nodemailer");

const APP_URL = process.env.APP_URL || "https://web-production-576d9.up.railway.app";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@selfmadelegends.com";
const APP_NAME = "Come Up";

class NotificationService {
  constructor() {
    this.enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    this.transporter = null;
    this.queue = [];

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async send(to, subject, html) {
    if (!this.enabled) {
      this.queue.push({ to, subject, sentAt: new Date().toISOString() });
      console.log(`[Email queued — SMTP not configured] To: ${to} | ${subject}`);
      return { queued: true };
    }
    try {
      await this.transporter.sendMail({ from: `"${APP_NAME}" <${FROM_EMAIL}>`, to, subject, html });
      return { sent: true };
    } catch (err) {
      console.error("Email send error:", err.message);
      return { error: err.message };
    }
  }

  // ── Welcome email after registration ──────────────────────────────────────
  async sendWelcome(email, name) {
    return this.send(
      email,
      `Welcome to ${APP_NAME}, ${name}! 🏆`,
      `<div style="font-family:sans-serif;background:#0f1419;color:#e0e0e0;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <h1 style="color:#00d4ff;">Welcome to Come Up, ${name}!</h1>
        <p style="color:#aaa;line-height:1.7;">You just joined the AI trading game where legends are made. Here's how to get started:</p>
        <div style="background:#1a1f2e;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:8px 0;">🤖 <strong style="color:#00ff88;">AI coach suggests trades</strong> — you're always in control, trade manually anytime</p>
          <p style="margin:8px 0;">🏆 <strong style="color:#00ff88;">Top 10 leaderboard</strong> — compete against players nationwide</p>
          <p style="margin:8px 0;">🪙 <strong style="color:#00ff88;">Create your own crypto token</strong> — launch it and let others trade it</p>
          <p style="margin:8px 0;">🎖️ <strong style="color:#00ff88;">Earn achievement badges</strong> — unlock milestones as you play</p>
        </div>
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;background:#00d4ff;color:#000;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;margin-top:10px;">Open Dashboard →</a>
        <p style="color:#555;font-size:0.8em;margin-top:30px;">Self-Made Legends LLC · <a href="${APP_URL}/privacy-policy.html" style="color:#555;">Privacy Policy</a></p>
      </div>`
    );
  }

  // ── Password reset email ───────────────────────────────────────────────────
  async sendPasswordReset(email, name, resetToken) {
    const resetUrl = `${APP_URL}/reset-password.html?token=${resetToken}`;
    return this.send(
      email,
      `Reset Your ${APP_NAME} Password`,
      `<div style="font-family:sans-serif;background:#0f1419;color:#e0e0e0;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <h2 style="color:#00d4ff;">Password Reset Request</h2>
        <p style="color:#aaa;">Hi ${name}, we received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#ff6b6b;color:#fff;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;margin:20px 0;">Reset My Password →</a>
        <p style="color:#555;font-size:0.85em;">If you didn't request this, ignore this email — your password won't change.</p>
        <p style="color:#555;font-size:0.8em;margin-top:30px;">Self-Made Legends LLC · <a href="${APP_URL}/privacy-policy.html" style="color:#555;">Privacy Policy</a></p>
      </div>`
    );
  }

  // ── Leaderboard movement alert ─────────────────────────────────────────────
  async sendLeaderboardAlert(email, name, newRank, previousRank) {
    const moved = newRank < previousRank ? "up" : "down";
    const emoji = moved === "up" ? "📈" : "📉";
    return this.send(
      email,
      `${emoji} You moved ${moved} to #${newRank} on the leaderboard!`,
      `<div style="font-family:sans-serif;background:#0f1419;color:#e0e0e0;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <h2 style="color:#00d4ff;">${emoji} Leaderboard Update</h2>
        <p style="color:#aaa;">Hey ${name}, your rank just changed!</p>
        <div style="background:#1a1f2e;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
          <div style="color:#888;font-size:0.9em;">Previous Rank</div>
          <div style="font-size:2em;color:#888;">#${previousRank}</div>
          <div style="font-size:2em;color:#00d4ff;">↓</div>
          <div style="color:#00ff88;font-size:0.9em;">New Rank</div>
          <div style="font-size:3em;font-weight:bold;color:#00ff88;">#${newRank}</div>
        </div>
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;background:#00d4ff;color:#000;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;">View Leaderboard →</a>
        <p style="color:#555;font-size:0.8em;margin-top:30px;">Self-Made Legends LLC · <a href="${APP_URL}/privacy-policy.html" style="color:#555;">Privacy Policy</a></p>
      </div>`
    );
  }

  // ── Badge earned alert ─────────────────────────────────────────────────────
  async sendBadgeEarned(email, name, badge) {
    return this.send(
      email,
      `🎖️ You earned the "${badge.name}" badge!`,
      `<div style="font-family:sans-serif;background:#0f1419;color:#e0e0e0;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <h2 style="color:#ffd700;">🎖️ New Badge Unlocked!</h2>
        <p style="color:#aaa;">Congrats ${name}, you just earned a new achievement badge!</p>
        <div style="background:#1a1f2e;border-radius:8px;padding:24px;margin:20px 0;text-align:center;">
          <div style="font-size:4em;">${badge.icon}</div>
          <div style="font-size:1.4em;font-weight:bold;color:#ffd700;margin:10px 0;">${badge.name}</div>
          <div style="color:#aaa;">${badge.description}</div>
        </div>
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;background:#ffd700;color:#000;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;">View Your Badges →</a>
        <p style="color:#555;font-size:0.8em;margin-top:30px;">Self-Made Legends LLC · <a href="${APP_URL}/privacy-policy.html" style="color:#555;">Privacy Policy</a></p>
      </div>`
    );
  }

  // ── Weekly recap ───────────────────────────────────────────────────────────
  async sendWeeklyRecap(email, name, stats) {
    return this.send(
      email,
      `📊 Your Weekly Recap — Come Up`,
      `<div style="font-family:sans-serif;background:#0f1419;color:#e0e0e0;padding:30px;border-radius:12px;max-width:600px;margin:0 auto;">
        <h2 style="color:#00d4ff;">📊 Your Weekly Recap</h2>
        <p style="color:#aaa;">Hey ${name}, here's how you did this week:</p>
        <div style="background:#1a1f2e;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:8px 0;">📈 Portfolio Return: <strong style="color:${stats.returnPct >= 0 ? '#00ff88' : '#ff4444'}">${stats.returnPct >= 0 ? '+' : ''}${(stats.returnPct || 0).toFixed(2)}%</strong></p>
          <p style="margin:8px 0;">🏆 Leaderboard Rank: <strong style="color:#00d4ff;">#${stats.rank || 'N/A'}</strong></p>
          <p style="margin:8px 0;">✅ Winning Trades: <strong style="color:#00ff88;">${stats.wins || 0}</strong></p>
          <p style="margin:8px 0;">❌ Losing Trades: <strong style="color:#ff4444;">${stats.losses || 0}</strong></p>
        </div>
        <a href="${APP_URL}/dashboard.html" style="display:inline-block;background:#00d4ff;color:#000;padding:14px 28px;border-radius:8px;font-weight:bold;text-decoration:none;">Keep Playing →</a>
        <p style="color:#555;font-size:0.8em;margin-top:30px;">Self-Made Legends LLC · <a href="${APP_URL}/privacy-policy.html" style="color:#555;">Privacy Policy</a> · <a href="${APP_URL}/dashboard.html?unsubscribe=1" style="color:#555;">Unsubscribe</a></p>
      </div>`
    );
  }

  getQueuedEmails() {
    return this.queue;
  }

  isEnabled() {
    return this.enabled;
  }
}

module.exports = NotificationService;
