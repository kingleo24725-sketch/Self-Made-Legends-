<?php
/**
 * Self-Made Legends — visit counter
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY THIS EXISTS
 *
 *  With the shop closed, the only number that matters is what fraction of
 *  visitors join the list. newsletter.csv gives the numerator. Without this
 *  there is no denominator, and no way to tell a good week from a bad one.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  WHAT IT DOES NOT DO
 *
 *  No third-party script. Nothing is sent to Google, Meta, or anyone else,
 *  the page does not wait for it, and there is no cookie — so there is no
 *  cookie banner to add either.
 *
 *  The IP address is never written down. It is mixed with a secret and with
 *  TODAY'S DATE and hashed, which gives a per-day visitor id: enough to tell
 *  fifty visits from five people apart from fifty visits from fifty, and
 *  useless for following anybody from one day to the next, because tomorrow
 *  the same person hashes to something different. That property is the whole
 *  point of including the date, so do not remove it to "make the numbers
 *  line up" across days.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

// A beacon is a POST. Anything else is somebody poking at the endpoint.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    exit;
}

/* ── Never let counting break the page ───────────────────────────────────
   This endpoint answers 204 no matter what happens below. A visit that
   fails to record is worth nothing; a visitor who sees an error because a
   counter fell over costs a sale. */
register_shutdown_function(static function (): void {
    if (!headers_sent()) {
        http_response_code(204);
    }
});
http_response_code(204);

// Answer immediately, then do the writing with the connection already closed,
// so the browser never waits on a disk write.
ignore_user_abort(true);
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

/* ── What we record ──────────────────────────────────────────────────── */

$path = sml_clean($_POST['path'] ?? '/', 120);
if ($path === '' || $path[0] !== '/') {
    $path = '/';
}

// Only the referrer's HOST, never the full URL. A full referrer can carry a
// search query or a private link, and neither is any of our business.
$refHost = '';
$ref = trim((string) ($_POST['ref'] ?? ''));
if ($ref !== '' && filter_var($ref, FILTER_VALIDATE_URL)) {
    $host = parse_url($ref, PHP_URL_HOST);
    if (is_string($host)) {
        $refHost = strtolower(preg_replace('/^www\./i', '', $host));
        // Our own pages linking to each other are navigation, not a source.
        if ($refHost === strtolower(preg_replace('/^www\./i', '', (string) parse_url(SML_SITE_URL, PHP_URL_HOST)))) {
            $refHost = '(direct)';
        }
    }
}
if ($refHost === '') {
    $refHost = '(direct)';
}

// Coarse only. "phone or not" answers whether the mobile layout matters;
// a full user-agent string is a fingerprint and is not written down.
$w = (int) ($_POST['w'] ?? 0);
$device = $w > 0 ? ($w < 700 ? 'phone' : ($w < 1100 ? 'tablet' : 'desktop')) : 'unknown';

/* ── The per-day visitor id ──────────────────────────────────────────────
   Rotates at midnight UTC by construction. SML_STATS_SALT is optional; the
   hash is still per-day without it, but setting it stops anyone who ever
   sees this file from recomputing the ids from a guessed IP. */
$salt = defined('SML_STATS_SALT') ? (string) SML_STATS_SALT : 'sml';
$visitor = substr(hash('sha256', $salt . '|' . gmdate('Y-m-d') . '|' . sml_client_ip() . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 16);

sml_append_csv(
    'views.csv',
    ['date', 'hour', 'path', 'referrer', 'device', 'visitor'],
    [gmdate('Y-m-d'), gmdate('H'), $path, $refHost, $device, $visitor]
);
