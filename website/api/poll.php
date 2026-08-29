<?php
/**
 * Self-Made Legends — Question of the Week
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * GET  → the current question, and the running tally once you have voted.
 * POST → records one vote.
 *
 * Votes are written to data/poll-<id>.csv, which is blocked from the web.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT BELOW EACH WEEK. NOTHING ELSE IN THIS FILE NEEDS TOUCHING.

   ┌──────────────────────────────────────────────────────────────────────┐
   │  To run a new question:                                              │
   │                                                                      │
   │  1. Change 'id' to a NEW value, e.g. '2026-W36'.                     │
   │     This is what starts a fresh vote — a new id means a new file,    │
   │     an empty tally, and everyone gets to vote again.                 │
   │     REUSING AN OLD ID KEEPS THE OLD VOTES AND LOCKS OUT ANYONE       │
   │     WHO ALREADY VOTED ON IT.                                         │
   │                                                                      │
   │  2. Change 'question' and the four 'options'.                        │
   │                                                                      │
   │  3. Fill in 'previous' with what won last week and what you did      │
   │     about it. This is the part that makes people vote again — it     │
   │     is the proof you actually listened. Leave the values empty       │
   │     ('') the very first week and the block simply won't show.        │
   │                                                                      │
   │  4. Upload this one file.                                            │
   │                                                                      │
   │  Old votes are never deleted. data/poll-2026-W35.csv stays on disk   │
   │  so you always have the record of what people asked for.             │
   └──────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════ */

const SML_POLL = [

    'id'       => '2026-W37',

    'question' => 'The Golden Throne is drawn. What gets made first?',

    // Shown under the question. Say when voting closes and what happens.
    'note'     => 'Voting closes Sunday. Whatever wins goes to the factory first.',

    // Four is the sweet spot. Fewer feels rigged, more splits the vote so
    // nothing wins clearly. Keep each one short enough to read at a glance.
    'options'  => [
        'a' => 'The hoodie — crest at the chest, full crest at the back',
        'b' => 'Royal Legacy — the black and gold high',
        'c' => 'Stealth Wealth — all black, nothing announced',
        'd' => 'The suit — Royal Black Gold, sizes 36 to 52',
    ],

    // Last week's result. Leave all three as '' until you have one.
    'previous' => [
        'question' => 'Ten drawn. Which two get made first?',
        'winner'   => 'Nothing — the line was redrawn before the vote closed.',
        'outcome'  => 'The whole range was replaced with the Golden Throne '
                    . 'Collection. Saying so beats quietly dropping a vote and '
                    . 'hoping nobody kept the tab open.',
    ],
    // ↑ Fill this in next week: last week's question, what won, and what you
    //   did about it. That block is what makes the second vote bigger than
    //   the first.
];

/* ═══════════════════════════════════════════════════════════════════════════
   You should not need to change anything below this line.
   ═══════════════════════════════════════════════════════════════════════ */

/** Only ever use the id as part of a filename after this. */
function sml_poll_id(): string
{
    $id = preg_replace('/[^A-Za-z0-9._-]/', '', (string) SML_POLL['id']) ?? '';
    return $id === '' ? 'current' : substr($id, 0, 40);
}

function sml_poll_file(): string
{
    return 'poll-' . sml_poll_id() . '.csv';
}

/**
 * Marker proving this visitor already voted in THIS poll.
 *
 * Namespaced by poll id, so changing the id in the block above lets everyone
 * vote again without anything needing to be cleaned up by hand.
 */
function sml_poll_marker(): ?string
{
    $dir = SML_DATA_DIR . '/.votes';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    return $dir . '/' . sml_poll_id() . '-' . hash('sha256', sml_client_ip()) . '.txt';
}

function sml_poll_has_voted(): bool
{
    $marker = sml_poll_marker();
    return $marker !== null && is_file($marker);
}

/**
 * Count the votes by reading the record itself.
 *
 * Deliberately not a separate counter file. A counter can drift away from
 * the rows it claims to summarise; a count taken from the rows cannot. At
 * this scale the read costs nothing, and it is only ever done for someone
 * who has already voted.
 */
function sml_poll_tally(): array
{
    $counts = array_fill_keys(array_keys(SML_POLL['options']), 0);
    $counts['other'] = 0;

    $path = SML_DATA_DIR . '/' . sml_poll_file();
    if (!is_file($path)) {
        return $counts;
    }

    $handle = @fopen($path, 'rb');
    if ($handle === false) {
        return $counts;
    }

    if (flock($handle, LOCK_SH)) {
        fgetcsv($handle); // header
        while (($row = fgetcsv($handle)) !== false) {
            $choice = $row[2] ?? '';
            if (array_key_exists($choice, $counts)) {
                $counts[$choice]++;
            }
        }
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    return $counts;
}

/**
 * The question, plus the tally only if this visitor has earned the right to
 * see it.
 *
 * Deliberately carries no 'ok' or 'message' key. This value is also passed to
 * sml_respond() as the extra payload on a failed vote, and those two keys
 * would otherwise overwrite the failure with a success.
 */
function sml_poll_state(bool $voted): array
{
    $options = [];
    foreach (SML_POLL['options'] as $key => $label) {
        $options[] = ['key' => (string) $key, 'label' => $label];
    }

    $state = [
        'id'       => sml_poll_id(),
        'question' => SML_POLL['question'],
        'note'     => SML_POLL['note'],
        'options'  => $options,
        'voted'    => $voted,
        'previous' => SML_POLL['previous'],
    ];

    // Results stay hidden until you vote. Showing a running total first would
    // steer the answer, and the whole point is finding out what people
    // actually want rather than what is already winning.
    if ($voted) {
        $counts = sml_poll_tally();
        $state['counts'] = $counts;
        $state['total']  = array_sum($counts);
    }

    return $state;
}

/* ── GET: hand the page the question ─────────────────────────────────────── */

$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(array_merge(['ok' => true], sml_poll_state(sml_poll_has_voted())));
    exit;
}

if ($method !== 'POST') {
    sml_respond(false, 'Method not allowed.', 'poll', 405);
}

/* ── POST: record one vote ───────────────────────────────────────────────── */

// Honeypot: a hidden field only an automated submitter fills in.
if (sml_clean($_POST['website'] ?? '', 200) !== '') {
    sml_respond(true, 'Thank you.', 'poll');
}

// A vote posted against a question that has since been replaced is dropped
// rather than counted against the new one.
$postedId = sml_clean($_POST['poll_id'] ?? '', 40);
if ($postedId !== sml_poll_id()) {
    sml_respond(false, "That question has closed. Refresh the page for this week's.", 'poll', 409);
}

if (sml_poll_has_voted()) {
    sml_respond(false, 'You have already voted this week. Come back Monday.', 'poll', 409, sml_poll_state(true));
}

if (!sml_throttle_ok()) {
    sml_respond(false, 'Please wait a moment before submitting again.', 'poll', 429);
}

$choice = sml_clean($_POST['choice'] ?? '', 10);
$idea   = sml_clean($_POST['idea']   ?? '', 500);

$valid = array_keys(SML_POLL['options']);
if ($choice === 'other') {
    if ($idea === '') {
        sml_respond(false, 'Tell us what you would rather see.', 'poll', 422);
    }
} elseif (!in_array($choice, $valid, true)) {
    sml_respond(false, 'Pick one of the options.', 'poll', 422);
} else {
    // A write-in only belongs to the "something else" answer.
    $idea = '';
}

$stamp = gmdate('Y-m-d H:i:s') . ' UTC';
$label = $choice === 'other' ? 'Something else' : SML_POLL['options'][$choice];

$stored = sml_append_csv(
    sml_poll_file(),
    ['timestamp', 'poll_id', 'choice', 'answer', 'write_in', 'ip'],
    [$stamp, sml_poll_id(), $choice, $label, $idea, sml_client_ip()]
);

if (!$stored) {
    sml_respond(false, 'We could not record your vote. Please try again shortly.', 'poll', 500);
}

// Written first, marked second. If the disk write fails the visitor is asked
// to retry rather than being locked out of a vote that was never counted.
$marker = sml_poll_marker();
if ($marker !== null) {
    @file_put_contents($marker, $stamp, LOCK_EX);
}

// One email per vote would be noise. A write-in is the opposite — it is
// somebody handing you an idea in their own words, so that one gets sent.
if ($idea !== '') {
    sml_notify(
        SML_TO_NEWSLETTER,
        'Poll write-in — ' . sml_poll_id(),
        "Somebody answered \"Something else\" on the Question of the Week.\n\n"
        . 'Question: ' . SML_POLL['question'] . "\n"
        . "Their answer:\n{$idea}\n\n"
        . "Time: {$stamp}\n"
    );
}

sml_throttle_record();
sml_respond(true, 'Vote counted. Here is where it stands.', 'poll', 200, sml_poll_state(true));
