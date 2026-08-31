<?php
/**
 * Self-Made Legends — what the numbers say
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  HOW TO READ YOUR NUMBERS
 *
 *  1. Open api/config.php and set SML_STATS_KEY to a long random string.
 *  2. Visit  https://selfmadelegendsz.com/api/stats.php?key=THAT_STRING
 *
 *  Until you set a key this page returns 404 and nothing else. That is
 *  deliberate: an unset password is not a password, and a stats page that
 *  works by default is a stats page anyone can find.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  The key travels in the URL, so treat it as low-value: it protects a view
 *  count and nothing more. It is not, and must never become, the password to
 *  anything else. No email addresses appear on this page.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

/* ── Gate ────────────────────────────────────────────────────────────── */

if (!defined('SML_STATS_KEY') || SML_STATS_KEY === '' || SML_STATS_KEY === 'change-me') {
    http_response_code(404);
    exit("Not found.\n");
}

// hash_equals compares in constant time, so the response cannot be used to
// guess the key one character at a time.
if (!hash_equals((string) SML_STATS_KEY, (string) ($_GET['key'] ?? ''))) {
    http_response_code(404);
    exit("Not found.\n");
}

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

/* ── Read ────────────────────────────────────────────────────────────── */

$days = max(1, min(365, (int) ($_GET['days'] ?? 30)));
$since = gmdate('Y-m-d', time() - ($days - 1) * 86400);

$views = read_csv('views.csv');
$signups = read_csv('newsletter.csv');

if (!$views) {
    exit("No visits recorded yet.\n\nIf the site is live and this stays empty, api/hit.php is not being reached —\ncheck that assets/js/sml.js loaded and that data/ is writable.\n");
}

$rows = array_values(array_filter($views, static fn(array $r): bool => ($r['date'] ?? '') >= $since));
$signupRows = array_values(array_filter($signups, static fn(array $r): bool => substr((string) ($r['timestamp'] ?? ''), 0, 10) >= $since));

$visits = count($rows);
$people = count(array_unique(array_column($rows, 'visitor')));
$joined = count($signupRows);

/* ── Report ──────────────────────────────────────────────────────────── */

$out = [];
$out[] = 'SELF-MADE LEGENDS — last ' . $days . ' days, to ' . gmdate('Y-m-d') . ' UTC';
$out[] = str_repeat('=', 62);
$out[] = '';
$out[] = sprintf('  %-22s %8s', 'Visits', number_format($visits));
$out[] = sprintf('  %-22s %8s', 'People', number_format($people));
$out[] = sprintf('  %-22s %8s', 'Joined the list', number_format($joined));
$out[] = '';

// The number this whole file exists to produce.
$out[] = sprintf(
    '  %-22s %8s   %s',
    'Signup rate',
    $people ? number_format($joined / $people * 100, 1) . '%' : '—',
    'of people who came, joined'
);
$out[] = '';
$out[] = '  1-3% is ordinary for a shop. 5%+ on a waiting list is good. One or';
$out[] = '  two people is not a rate yet — it is a coincidence. Wait for 100.';
$out[] = '';

$out[] = section('BY DAY', tally($rows, 'date'), $days, true);
$out[] = section('WHERE THEY CAME FROM', tally($rows, 'referrer'), 10);
$out[] = section('WHAT THEY LOOKED AT', tally($rows, 'path'), 10);
$out[] = section('ON WHAT', tally($rows, 'device'), 5);

// Which piece people asked for is the closest thing to an order book that
// exists while the shop is shut, so it is reported even though it is not a
// visit statistic.
$wants = [];
foreach ($signupRows as $r) {
    $w = trim((string) ($r['wants'] ?? ''));
    if ($w !== '') {
        $wants[$w] = ($wants[$w] ?? 0) + 1;
    }
}
arsort($wants);
if ($wants) {
    $out[] = section('WHAT THEY ASKED FOR', $wants, 20);
} else {
    $out[] = "WHAT THEY ASKED FOR\n" . str_repeat('-', 62) . "\n  Nobody has claimed a number on a specific piece yet.\n";
}

echo implode("\n", $out), "\n";

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Read one of the data CSVs into rows keyed by its header. */
function read_csv(string $name): array
{
    $path = SML_DATA_DIR . '/' . $name;
    if (!is_file($path)) {
        return [];
    }
    $fh = @fopen($path, 'rb');
    if ($fh === false) {
        return [];
    }
    $header = fgetcsv($fh);
    if ($header === false) {
        fclose($fh);
        return [];
    }
    $rows = [];
    while (($line = fgetcsv($fh)) !== false) {
        // A row written before a column was added is short. Pad it rather
        // than dropping it — the visit still happened.
        while (count($line) < count($header)) {
            $line[] = '';
        }
        $rows[] = array_combine($header, array_slice($line, 0, count($header)));
    }
    fclose($fh);
    return $rows;
}

function tally(array $rows, string $key): array
{
    $out = [];
    foreach ($rows as $r) {
        $v = (string) ($r[$key] ?? '');
        if ($v === '') {
            $v = '(none)';
        }
        $out[$v] = ($out[$v] ?? 0) + 1;
    }
    arsort($out);
    return $out;
}

/** One block, with a bar so the shape is visible without doing arithmetic. */
function section(string $title, array $counts, int $limit, bool $chronological = false): string
{
    if ($chronological) {
        ksort($counts);
        $counts = array_slice($counts, -$limit, null, true);
    } else {
        $counts = array_slice($counts, 0, $limit, true);
    }
    $max = $counts ? max($counts) : 0;
    $lines = [$title, str_repeat('-', 62)];
    foreach ($counts as $label => $n) {
        $bar = $max ? str_repeat('#', max(1, (int) round($n / $max * 28))) : '';
        $lines[] = sprintf('  %-24s %6s  %s', mb_strimwidth((string) $label, 0, 24, '…'), number_format($n), $bar);
    }
    if (!$counts) {
        $lines[] = '  (nothing yet)';
    }
    $lines[] = '';
    return implode("\n", $lines);
}
