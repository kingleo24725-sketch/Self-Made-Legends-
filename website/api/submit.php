<?php
/**
 * Self-Made Legends — form handler
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Handles the newsletter signup, The Legendary Pull entries, and customer
 * support messages.
 * Every submission is appended to a CSV in ../data (blocked from the web)
 * and emailed to the address configured in config.php.
 *
 * Responds with JSON to fetch() requests, and with a redirect for visitors
 * whose JavaScript is off, so the forms work either way.
 */

declare(strict_types=1);

// Shared helpers and settings. See lib.php and config.php.
require __DIR__ . '/lib.php';

/* ── guards ──────────────────────────────────────────────────────────── */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    sml_respond(false, 'Method not allowed.', '', 405);
}

$formType = sml_clean($_POST['form_type'] ?? '', 20);
if (!in_array($formType, ['newsletter', 'legend', 'support'], true)) {
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
    // Which piece they clicked "Claim a Number" on, if they came from one.
    // Empty for anyone who joined from the newsletter block directly — that
    // is a normal signup, not a fault, so it is never required.
    //
    // The header row is only written when the file is created. If a
    // newsletter.csv from before this column already exists on the server,
    // its rows keep three fields and new ones carry four, so the last column
    // arrives unlabelled. Delete the file first if it has nothing in it yet.
    $wants = sml_clean($_POST['wants'] ?? '', 60);

    $stored = sml_append_csv(
        'newsletter.csv',
        ['timestamp', 'email', 'wants', 'ip'],
        [$stamp, $email, $wants, $ip]
    );

    if (!$stored) {
        sml_respond(false, 'We could not save your signup. Please email info@selfmadelegendsz.com.', $formType, 500);
    }

    sml_notify(
        SML_TO_NEWSLETTER,
        $wants !== '' ? "Newsletter signup — wants {$wants}" : 'New newsletter signup',
        "New newsletter signup.\n\n"
        . "Email: {$email}\n"
        . 'Wants: ' . ($wants !== '' ? $wants : '(joined from the newsletter block)') . "\n"
        . "Time:  {$stamp}\n"
        . "IP:    {$ip}\n",
        $email
    );

    sml_throttle_record();
    sml_respond(true, "You're on the list. Drops announce there first.", $formType);
}

/* ── support: customer problems and complaints ───────────────────────── */

if ($formType === 'support') {
    $name    = sml_clean($_POST['name']    ?? '', 80);
    $topic   = sml_clean($_POST['topic']   ?? '', 60);
    $order   = sml_clean($_POST['order']   ?? '', 40);
    $message = sml_clean($_POST['message'] ?? '', 2500);

    if ($name === '') {
        sml_respond(false, 'Please enter your name.', $formType, 422);
    }
    if (mb_strlen($message) < 10) {
        sml_respond(false, 'Please tell us what went wrong.', $formType, 422);
    }
    if ($topic === '') {
        $topic = 'General';
    }

    $stored = sml_append_csv(
        'support.csv',
        ['timestamp', 'name', 'email', 'topic', 'order', 'message', 'ip'],
        [$stamp, $name, $email, $topic, $order, $message, $ip]
    );

    // A complaint must never be silently lost because a disk write failed.
    if (!$stored) {
        sml_respond(false, 'We could not save your message. Please email ceo@selfmadelegendsz.com directly.', $formType, 500);
    }

    $body = "Customer message — {$topic}\n\n"
          . "Name:  {$name}\n"
          . "Email: {$email}\n"
          . "Order: " . ($order !== '' ? $order : '(not given)') . "\n"
          . "Time:  {$stamp}\n\n"
          . "Message:\n{$message}\n\n"
          . "— Reply directly to this email to answer them.\n";

    sml_notify(SML_TO_SUPPORT, 'Customer: ' . $topic . ' — ' . $name, $body, $email);

    sml_throttle_record();
    sml_respond(true, 'Message received. We read every one and will reply personally.', $formType);
}

/* ── The Legendary Pull: monthly entry ───────────────────────────────── */

$name  = sml_clean($_POST['name']  ?? '', 80);
$why   = sml_clean($_POST['why']   ?? '', 4000);
$video = sml_clean($_POST['video'] ?? '', 300);

if ($name === '') {
    sml_respond(false, 'Please enter your name.', $formType, 422);
}

// An entry is either a written note or a link to a video. One or the other
// must actually be there, or there is nothing to judge.
if (mb_strlen($why) < 20 && $video === '') {
    sml_respond(false, 'Tell us your story, or paste a link to your video.', $formType, 422);
}

// Only accept a video link that is actually a link. A pasted handle or a
// half-typed address would otherwise be stored as if it were an entry.
if ($video !== '' && !filter_var($video, FILTER_VALIDATE_URL)) {
    sml_respond(false, 'That video link does not look right. Paste the full web address.', $formType, 422);
}

if (sml_clean($_POST['consent'] ?? '', 10) !== 'yes') {
    sml_respond(false, 'Please agree to the house rules before entering.', $formType, 422);
}

$city   = sml_clean($_POST['city']   ?? '', 80);
$social = sml_clean($_POST['social'] ?? '', 80);

// Entries are grouped by month so a month's judging is one filter, not a
// hunt through everything ever submitted.
$month = gmdate('Y-m');

$stored = sml_append_csv(
    'legends.csv',
    ['month', 'timestamp', 'name', 'email', 'city', 'social', 'video', 'why', 'ip'],
    [$month, $stamp, $name, $email, $city, $social, $video, $why, $ip]
);

if (!$stored) {
    sml_respond(false, 'We could not save your entry. Please email info@selfmadelegendsz.com.', $formType, 500);
}

$body = "New entry — The Legendary Pull ({$month})\n\n"
      . "Name:     {$name}\n"
      . "Email:    {$email}\n"
      . "Location: " . ($city   !== '' ? $city   : '(not given)') . "\n"
      . "Social:   " . ($social !== '' ? $social : '(not given)') . "\n"
      . "Video:    " . ($video  !== '' ? $video  : '(written entry)') . "\n"
      . "Time:     {$stamp}\n\n"
      . "Their story:\n" . ($why !== '' ? $why : '(video entry only)') . "\n";

sml_notify(SML_TO_LEGEND, 'The Pull — ' . $name, $body, $email);

sml_throttle_record();
sml_respond(true, 'Your entry is in. One name is called at the end of the month.', $formType);
