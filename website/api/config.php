<?php
/**
 * Self-Made Legends — form configuration
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS IS THE ONLY FILE YOU NEED TO EDIT TO CHANGE WHERE MAIL GOES.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Where form submissions are emailed. Create these mailboxes in your
// InterServer cPanel first — mail sent to an address that does not exist
// will bounce or vanish.
const SML_TO_NEWSLETTER = 'info@selfmadelegendsz.com';
const SML_TO_LEGEND     = 'info@selfmadelegendsz.com';

// Customer problems and complaints go straight to the CEO, not to info@.
const SML_TO_SUPPORT    = 'ceo@selfmadelegendsz.com';

// The From address on outgoing notifications. This MUST be an address at
// your own domain, or your mail will be treated as spoofed and filtered.
// Do not put the visitor's address here — their address goes in Reply-To.
const SML_FROM       = 'noreply@selfmadelegendsz.com';
const SML_FROM_NAME  = 'Self-Made Legends';

// Your live site, used to send visitors back after a no-JavaScript submit.
const SML_SITE_URL = 'https://selfmadelegendsz.com';

// Where the CSV records are written, relative to this file.
// The data directory is blocked from the web by data/.htaccess.
const SML_DATA_DIR = __DIR__ . '/../data';

// Anti-spam: minimum seconds between submissions from one IP address.
const SML_THROTTLE_SECONDS = 20;

/* ── Your numbers ────────────────────────────────────────────────────────
   Set this to a long random string and then visit
       https://selfmadelegendsz.com/api/stats.php?key=THAT_STRING
   to see visits, how many people, and what share of them joined the list.

   While it is left as 'change-me' the stats page returns 404 and nothing
   else, because an unset password is not a password.

   It travels in the URL, so treat it as low value — it guards a view count.
   Never reuse a password from anywhere else here. */
const SML_STATS_KEY = 'change-me';

/* Mixed into the daily visitor hash so that nobody who reads hit.php can
   recompute visitor ids from a guessed IP address. Any long random string.
   Changing it re-shuffles the ids, which makes one day's "people" count not
   comparable with the days before it — so set it once and leave it. */
const SML_STATS_SALT = 'change-me-too';
