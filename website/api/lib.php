<?php
/**
 * Self-Made Legends — shared helpers
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Used by submit.php (the forms) and poll.php (Question of the Week).
 *
 * You should not need to edit this file. Settings live in config.php.
 * These functions are shared deliberately: a fix to the sanitising here
 * fixes it everywhere, rather than in one file and not the other.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Never print PHP warnings into a JSON response.
ini_set('display_errors', '0');
error_reporting(E_ALL);

/** Is this an AJAX request from our own script? */
function sml_is_ajax(): bool
{
    return isset($_SERVER['HTTP_X_REQUESTED_WITH'])
        && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/** Send the response and stop, in whichever form the caller expects. */
function sml_respond(bool $ok, string $message, string $formType = '', int $status = 200, array $extra = []): void
{
    if (sml_is_ajax()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array_merge(['ok' => $ok, 'message' => $message], $extra));
        exit;
    }

    $anchors = [
        'legend'     => '#legend',
        'support'    => '#support',
        'newsletter' => '#newsletter',
        'poll'       => '#poll',
    ];
    $anchor = $anchors[$formType] ?? '#newsletter';
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
