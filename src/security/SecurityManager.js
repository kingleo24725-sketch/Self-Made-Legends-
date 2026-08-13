const crypto = require("crypto");
const bcrypt = require("bcrypt");

class SecurityManager {
  constructor() {
    this.failedAttempts = new Map();
    this.blockedIPs = new Set();
    this.suspiciousSessions = new Map();
    this.auditLog = [];
    this.securityAlerts = [];
    this.rate_limiter = new Map();
  }

  // Generate secure random token (256-bit entropy)
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  // Hash password using bcrypt (cost factor: 12)
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Verify password against hash
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Encrypt data using AES-256-GCM
  encryptData(data, encryptionKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(encryptionKey, "hex"),
      iv
    );

    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      encryptedData: encrypted,
      authTag: authTag.toString("hex"),
    };
  }

  // Decrypt data using AES-256-GCM
  decryptData(encryptedObj, encryptionKey) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        Buffer.from(encryptionKey, "hex"),
        Buffer.from(encryptedObj.iv, "hex")
      );

      decipher.setAuthTag(Buffer.from(encryptedObj.authTag, "hex"));

      let decrypted = decipher.update(encryptedObj.encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  // Track failed login attempts
  trackFailedAttempt(userId) {
    const current = this.failedAttempts.get(userId) || { count: 0, lastAttempt: null };
    current.count++;
    current.lastAttempt = new Date();

    this.failedAttempts.set(userId, current);

    this.logAudit("FAILED_LOGIN", userId, { attempts: current.count });

    if (current.count >= 5) {
      this.securityAlert("ACCOUNT_LOCKED", userId, { reason: "Multiple failed login attempts" });
      return { locked: true, attempts: current.count };
    }

    return { locked: false, attempts: current.count };
  }

  // Reset failed attempts on successful login
  resetFailedAttempts(userId) {
    this.failedAttempts.delete(userId);
    this.logAudit("LOGIN_SUCCESS", userId, { status: "success" });
  }

  // Rate limiting per user
  checkRateLimit(userId, limit = 100, windowMs = 60000) {
    const key = `ratelimit:${userId}`;
    const now = Date.now();

    if (!this.rate_limiter.has(key)) {
      this.rate_limiter.set(key, []);
    }

    const requests = this.rate_limiter.get(key);
    const recentRequests = requests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= limit) {
      this.securityAlert("RATE_LIMIT_EXCEEDED", userId, {
        requests: recentRequests.length,
        limit,
      });
      return false;
    }

    recentRequests.push(now);
    this.rate_limiter.set(key, recentRequests);
    return true;
  }

  // Detect suspicious activity based on geographic location
  detectGeographicAnomaly(userId, newIp, previousIps) {
    // In production, would use GeoIP database
    // For now, flag rapid geographic changes as suspicious
    if (previousIps.length > 0 && previousIps[0] !== newIp) {
      this.logAudit("GEOGRAPHIC_CHANGE", userId, {
        newIp,
        previousIp: previousIps[0],
      });
      return true;
    }
    return false;
  }

  // Validate input to prevent SQL injection and XSS
  validateInput(input, type = "text") {
    if (typeof input !== "string") return false;

    const sanitized = input
      .replace(/[<>\"'&]/g, (char) => {
        const map = {
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "&": "&amp;",
        };
        return map[char];
      })
      .trim();

    switch (type) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) ? sanitized : null;
      case "password":
        return sanitized.length >= 12 ? sanitized : null;
      case "number":
        return /^\d+(\.\d{1,2})?$/.test(sanitized) ? sanitized : null;
      case "text":
        return sanitized.length > 0 ? sanitized : null;
      default:
        return sanitized;
    }
  }

  // Generate JWT-like token
  generateJWT(payload, secret, expiresIn = 900) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64"
    );
    const now = Math.floor(Date.now() / 1000);
    const payloadWithExp = { ...payload, exp: now + expiresIn, iat: now };
    const encodedPayload = Buffer.from(JSON.stringify(payloadWithExp)).toString("base64");

    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${encodedPayload}`)
      .digest("base64");

    return `${header}.${encodedPayload}.${signature}`;
  }

  // Verify JWT token
  verifyJWT(token, secret) {
    try {
      const [header, payload, signature] = token.split(".");

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64");

      if (signature !== expectedSignature) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payload, "base64").toString());

      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Log all activities for audit trail
  logAudit(action, userId, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      ipAddress: details.ipAddress || "unknown",
    };

    this.auditLog.push(auditEntry);

    if (this.auditLog.length > 100000) {
      this.auditLog = this.auditLog.slice(-50000);
    }

    return auditEntry;
  }

  // Create security alert
  securityAlert(alertType, userId, details = {}) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: alertType,
      userId,
      details,
      severity: this.getSeverity(alertType),
    };

    this.securityAlerts.push(alert);

    console.error(`🚨 SECURITY ALERT: ${alertType}`, alert);

    return alert;
  }

  // Determine alert severity
  getSeverity(alertType) {
    const criticalAlerts = ["UNAUTHORIZED_ACCESS", "DATA_BREACH", "RANSOMWARE", "ACCOUNT_LOCKED"];
    const highAlerts = ["FAILED_LOGIN", "RATE_LIMIT_EXCEEDED", "GEOGRAPHIC_ANOMALY"];

    if (criticalAlerts.includes(alertType)) return "CRITICAL";
    if (highAlerts.includes(alertType)) return "HIGH";
    return "MEDIUM";
  }

  // Get audit log for specific user
  getUserAuditLog(userId, limit = 100) {
    return this.auditLog
      .filter((entry) => entry.userId === userId)
      .slice(-limit);
  }

  // Get all security alerts
  getSecurityAlerts(limit = 50) {
    return this.securityAlerts.slice(-limit);
  }

  // Check if IP is blocked
  isIpBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // Block an IP address
  blockIp(ip, reason = "suspicious activity") {
    this.blockedIPs.add(ip);
    this.securityAlert("IP_BLOCKED", "system", { ip, reason });
  }

  // Unblock an IP address
  unblockIp(ip) {
    this.blockedIPs.delete(ip);
    this.logAudit("IP_UNBLOCKED", "system", { ip });
  }

  // Validate data integrity using HMAC
  generateHmac(data, secret) {
    return crypto.createHmac("sha256", secret).update(JSON.stringify(data)).digest("hex");
  }

  // Verify data integrity
  verifyHmac(data, hmac, secret) {
    const expectedHmac = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  }

  // Check password against common breach database
  checkPasswordBreach(password) {
    // In production, would check against HaveIBeenPwned API
    const commonPasswords = [
      "password123",
      "123456789",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "dragon",
      "master",
      "sunshine",
      "princess",
    ];

    return !commonPasswords.includes(password.toLowerCase());
  }
}

module.exports = SecurityManager;
