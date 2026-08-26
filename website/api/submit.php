<?php
/**
 * Self-Made Legends — form handler
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Handles the newsletter signup and the Ambassador Program application.
 * Every submission is appended to a CSV in ../data (blocked from the web)
 * and emailed to the address configured in config.php.
 *
 * Responds with JSON to fetch() requests, and with a redirect for visitors
 * whose JavaScript is off, so the forms work either way.
 */

declare(strict_types=1);

require __DIR__ . '/config.php';

// Never print PHP warnings into a JSON response.
ini_set('display_errors', '0');
error_reporting(E_ALL);

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Is this an AJAX request from our own script? */
function sml_is_ajax(): bool
{
    return isset($_SERVER['HTTP_X_REQUESTED_WITH'])
        && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/** Send the response and stop, in whichever form the caller expects. */
function sml_respond(bool $ok, string $message, string $formType = '', int $status = 200): void
{
    if (sml_is_ajax()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
        exit;
    }

    $anchor = $formType === 'ambassador' ? '#ambassador' : '#newsletter';
    $query  = $ok
        ? '?sent=' . rawurlencode($formType)
        : '?error=' . rawurlencode($message) . '&form=' . rawurlencode($formType);

    header('Location: ' . SML_SITE_URL . '/' . $query . $anchor, true, 303);
    exit;
}

/** Collapse whitespace, trim, and hard-cap length. */
function sml_clean(?string $value, int $max): string
{
    $value = (string) $value;
    // Strip control characters, including the CR/LF used for header injection.
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    return mb_substr($value, 0, $max);
}

/**
 * Neutralise spreadsheet formula injection.
 * A CSV field beginning with = + - @ or a control character is executed as a
 * formula by Excel and Google Sheets when the export is opened.
 */
function sml_csv_safe(string $value): string
{
    if ($value !== '' && strpbrk($value[0], "=+-@\t\r") !== false) {
        return "'" . $value;
    }
    return $value;
}

/** Best-effort client IP. Only used for throttling, never trusted. */
function sml_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/** Path to this caller's throttle marker. */
function sml_throttle_file(): ?string
{
    $dir = SML_DATA_DIR . '/.throttle';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null; // Never block a real submission because of a disk problem.
    }
    return $dir . '/' . hash('sha256', sml_client_ip()) . '.txt';
}

/**
 * Per-IP rate limit, read-only.
 *
 * This deliberately does not record anything. Only a submission that is
 * actually accepted starts the clock — otherwise someone who mistypes their
 * email, gets the error, and corrects it would be told to wait, which
 * punishes the honest visitor and not the bot.
 */
function sml_throttle_ok(): bool
{
    $file = sml_throttle_file();
    if ($file === null || !is_file($file)) {
        return true;
    }

    $last = (int) @file_get_contents($file);
    return $last <= 0 || (time() - $last) >= SML_THROTTLE_SECONDS;
}

/** Start the clock. Called only once a submission has been accepted. */
function sml_throttle_record(): void
{
    $file = sml_throttle_file();
    if ($file !== null) {
        @file_put_contents($file, (string) time(), LOCK_EX);
    }
}

/** Append one row to a CSV, writing the header row on first use. */
function sml_append_csv(string $filename, array $header, array $row): bool
{
    if (!is_dir(SML_DATA_DIR) && !@mkdir(SML_DATA_DIR, 0700, true) && !is_dir(SML_DATA_DIR)) {
        return false;
    }

    $path   = SML_DATA_DIR . '/' . $filename;
    $isNew  = !is_file($path);
    $handle = @fopen($path, 'ab');
    if ($handle === false) {
        return false;
    }

    $written = false;
    if (flock($handle, LOCK_EX)) {
        if ($isNew) {
            fputcsv($handle, $header);
        }
        $written = fputcsv($handle, array_map('sml_csv_safe', $row)) !== false;
        fflush($handle);
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    if ($isNew) {
        @chmod($path, 0600);
    }
    return $written;
}

/** Send a notification. The visitor's address goes in Reply-To, never From. */
function sml_notify(string $to, string $subject, string $body, string $replyTo = ''): bool
{
    $subject = sml_clean($subject, 160);

    $headers = [
        'From: ' . sml_clean(SML_FROM_NAME, 60) . ' <' . SML_FROM . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'MIME-Version: 1.0',
        'X-Mailer: SML-Site',
    ];

    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    return @mail($to, $subject, $body, implode("\r\n", $headers));
}

/* ── guards ──────────────────────────────────────────────────────────── */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    sml_respond(false, 'Method not allowed.', '', 405);
}

$formType = sml_clean($_POST['form_type'] ?? '', 20);
if (!in_array($formType, ['newsletter', 'ambassador'], true)) {
    sml_respond(false, 'Unknown form.', '', 400);
}

// Honeypot: a hidden field only an automated submitter fills in.
// Answer as though it succeeded so the bot has nothing to learn.
if (sml_clean($_POST['website'] ?? '', 200) !== '') {
    sml_respond(true, 'Thank you.', $formType);
}

if (!sml_throttle_ok()) {
    sml_respond(false, 'Please wait a moment before submitting again.', $formType, 429);
}

$email = sml_clean($_POST['email'] ?? '', 120);
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sml_respond(false, 'Please enter a valid email address.', $formType, 422);
}

$stamp = gmdate('Y-m-d H:i:s') . ' UTC';
$ip    = sml_client_ip();

/* ── newsletter ──────────────────────────────────────────────────────── */

if ($formType === 'newsletter') {
    $stored = sml_append_csv(
        'newsletter.csv',
        ['timestamp', 'email', 'ip'],
        [$stamp, $email, $ip]
    );

    if (!$stored) {
        sml_respond(false, 'We could not save your signup. Please email info@selfmadelegendsz.com.', $formType, 500);
    }

    sml_notify(
        SML_TO_NEWSLETTER,
        'New newsletter signup',
        "New newsletter signup.\n\nEmail: {$email}\nTime:  {$stamp}\nIP:    {$ip}\n",
        $email
    );

    sml_throttle_record();
    sml_respond(true, "You're on the list. Drops announce there first.", $formType);
}

/* ── ambassador ──────────────────────────────────────────────────────── */

$name = sml_clean($_POST['name'] ?? '', 80);
$why  = sml_clean($_POST['why']  ?? '', 1200);

if ($name === '') {
    sml_respond(false, 'Please enter your name.', $formType, 422);
}
if (mb_strlen($why) < 10) {
    sml_respond(false, 'Please tell us a little about yourself.', $formType, 422);
}
if (sml_clean($_POST['consent'] ?? '', 10) !== 'yes') {
    sml_respond(false, 'Please agree to be contacted before submitting.', $formType, 422);
}

$city   = sml_clean($_POST['city']   ?? '', 80);
$social = sml_clean($_POST['social'] ?? '', 80);
$reach  = sml_clean($_POST['reach']  ?? '', 60);

$stored = sml_append_csv(
    'ambassadors.csv',
    ['timestamp', 'name', 'email', 'city', 'social', 'reach', 'why', 'ip'],
    [$stamp, $name, $email, $city, $social, $reach, $why, $ip]
);

if (!$stored) {
    sml_respond(false, 'We could not save your application. Please email info@selfmadelegendsz.com.', $formType, 500);
}

$body = "New Ambassador Program application.\n\n"
      . "Name:     {$name}\n"
      . "Email:    {$email}\n"
      . "Location: {$city}\n"
      . "Social:   {$social}\n"
      . "Audience: {$reach}\n"
      . "Time:     {$stamp}\n"
      . "IP:       {$ip}\n\n"
      . "Why:\n{$why}\n";

sml_notify(SML_TO_AMBASSADOR, 'Ambassador application — ' . $name, $body, $email);

sml_throttle_record();
sml_respond(true, 'Application received. You will hear back either way.', $formType);
