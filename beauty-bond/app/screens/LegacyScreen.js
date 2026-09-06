/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The emotional core of the app. docs/architecture.md M08, wireframes W-70.
 *
 * NO streaks, NO confetti, NO badges, NO gamification anywhere in this module.
 * "Talk to someone" is always present, and it is region-aware.
 *
 * This screen used to be a static mockup: a hardcoded woman named Denise, four
 * unpressable emoji chips, one fake sealed letter, and three buttons that did
 * nothing. Every part of it now reads and writes real data.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Linking, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import { COPY, HELPLINES, VAULT_KINDS, JOURNAL_PROMPTS } from '../utils/constants';
import api from '../utils/api';
import { encryptEntry, decryptEntry, hasJournalKey } from '../utils/journalCrypto';
import { journalAvailable, JOURNAL_UNAVAILABLE_REASON } from '../utils/config';
import dialog from '../utils/dialog';
import { VAULT_TEXT_KINDS } from '../utils/constants';
import { normaliseDate } from '../utils/validators';

export default function LegacyScreen({ navigation }) {
  const t = useTheme();
  const { profile, isAdult } = useAuth();
  const { can } = useSubscription();

  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([]);
  const [vault, setVault] = useState({ limit: 3, readOnly: false });
  const [letters, setLetters] = useState({ sealed: [], delivered: [] });
  // Letters I WROTE, sealed, waiting on their date. /legacy/letters is what is
  // addressed to me; a father sees his own letters only through the outbox.
  const [outbox, setOutbox] = useState([]);
  // The guardian's children — a letter needs someone to be for.
  const [children, setChildren] = useState([]);
  const [entries, setEntries] = useState([]);
  const [keyExists, setKeyExists] = useState(true);
  const [loading, setLoading] = useState(true);

  const person = people[0] ?? null;

  const load = useCallback(async () => {
    try {
      const [p, l, j, o, c] = await Promise.all([
        api.get('/legacy/people'),
        api.get('/legacy/letters'),
        api.get('/journal'),
        api.get('/legacy/letters/outbox').catch(() => ({ letters: [] })),
        // A child profile is refused here (adults only); that is not an error.
        api.get('/guardian/children').catch(() => ({ children: [] })),
      ]);
      setPeople(p?.people ?? []);
      setLetters({ sealed: l?.sealed ?? [], delivered: l?.delivered ?? [] });
      setOutbox(o?.letters ?? []);
      setChildren(c?.children ?? []);
      setKeyExists(await hasJournalKey());

      // Decryption happens here, on the device. The server sent opaque bytes.
      // An entry written under a key this phone no longer holds comes back
      // null — it is shown as unreadable, never as garbage.
      setEntries(await Promise.all((j?.entries ?? []).map(async (e) => ({
        ...e,
        text: e.presenceOnly ? null : await decryptEntry(e.ciphertext, e.keyId),
      }))));

      if (p?.people?.length) {
        const i = await api.get(`/legacy/items?personId=${p.people[0].id}`);
        setItems(i?.items ?? []);
        setVault({ limit: i?.limit ?? 3, readOnly: !!i?.readOnly });
      }
    } catch {
      // Offline: show what we can rather than an error page. This module is
      // opened by people who are grieving; it should never scold.
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // On focus, not on mount. Tabs stay mounted, so a mount-only load showed
  // the same "Add your daughter" button after a dad had gone to the Guardian
  // Console, added her, and come back — the one thing he came back to see.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addPerson() {
    const name = await dialog.prompt(
      'Who are we remembering?',
      'Just their name for now. You can add more whenever you want.',
      { placeholder: 'Their name', ok: 'Add' },
    );
    if (!name) return;
    try {
      await api.post('/legacy/people', { name });
      load();
    } catch {
      dialog.alert('Legacy', "That didn't save. Try again when you're ready.");
    }
  }

  /**
   * Put words in the vault. Text kinds only — voice and photo need an object
   * store that does not exist yet, and their cards say so instead of offering
   * a button that pretends. Migration 007 is what lets the row hold the words.
   */
  async function addItem(kind) {
    if (!person || vault.readOnly) return;
    const ask = {
      recipe:  ['Her recipe', 'Ingredients, steps, the thing she never measured.', 'Sweet potato pie…'],
      routine: ['Her routine', 'Morning, night, Sunday — however she did it.', 'First the moisturiser, then…'],
      shade:   ['Her shades', 'Lipstick names, foundation numbers, the liner she swore by.', 'Ruby Woo. Always.'],
      note:    ['Something she said', 'A line you can still hear.', '"Fix your face, baby."'],
    }[kind];
    if (!ask) return;
    const text = await dialog.prompt(ask[0], ask[1],
      { placeholder: ask[2], ok: 'Keep it', multiline: kind !== 'shade' });
    if (!text) return;
    try {
      await api.post('/legacy/items', { legacyPersonId: person.id, kind, text });
      load();
    } catch (e) {
      dialog.alert('The vault', e?.code === 'vault_full'
        ? `Your vault is full at ${e?.body?.limit ?? vault.limit}. Nothing has been removed.`
        : "That didn't save. Try again when you're ready.");
    }
  }

  /**
   * Write a letter forward. Three questions, then it is sealed until its day.
   * The recipient is the guardian's daughter — v1 has one — and the words are
   * withheld from everyone, the writer included, until deliverOn.
   */
  async function writeLetter() {
    const to = children[0];
    if (!to) return;

    const occasion = await dialog.prompt(`For ${to.displayName}`,
      'What is this letter for? Her 16th birthday, her wedding morning, the first day she moves out.',
      { placeholder: 'Her 16th birthday', ok: 'Next' });
    if (!occasion) return;

    const dateRaw = await dialog.prompt('When should she open it?',
      'It stays sealed until then. Nobody can read it early — not even you.',
      { placeholder: 'YYYY-MM-DD', ok: 'Next' });
    if (!dateRaw) return;
    const deliverOn = normaliseDate(dateRaw);
    if (!deliverOn) {
      dialog.alert('That date', 'Please write it as YYYY-MM-DD, like 2040-03-14.');
      return;
    }

    const text = await dialog.prompt(occasion, `Only ${to.displayName} will ever read this, on that day.`,
      { placeholder: 'Start anywhere.', ok: 'Seal it', multiline: true });
    if (!text) return;

    try {
      await api.post('/legacy/letters', {
        toProfileId: to.id, occasion, deliverOn, text, legacyPersonId: person?.id ?? null,
      });
      load();
      dialog.alert('Sealed', `It opens for ${to.displayName} on ${formatDate(deliverOn)}. `
        + 'It will arrive whatever happens — at any plan, even a cancelled one.');
    } catch (e) {
      dialog.alert('That letter', e?.code === 'upgrade_required'
        ? 'Letters Forward is part of a paid plan.'
        : "That didn't seal. Your words are still here — try again.");
    }
  }

  async function sitWithIt(promptId) {
    try {
      await api.post('/journal/presence', { promptId });
      dialog.alert('', 'Logged. Nothing else needed.');
    } catch { /* presence is never worth an error message */ }
  }

  function talkToSomeone() {
    const line = HELPLINES[profile?.region] ?? HELPLINES.DEFAULT;
    Linking.openURL(line.url).catch(() => {});
  }

  const prompt = JOURNAL_PROMPTS[
    new Date().getDate() % JOURNAL_PROMPTS.length
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[5] }}>

        {/* ── Who ─────────────────────────────────────────────────── */}
        {person ? (
          <Card>
            <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>
              {person.name}
            </Text>
            {(person.bornYear || person.passedYear) && (
              <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                {person.bornYear ?? '?'} – {person.passedYear ?? '?'}
              </Text>
            )}
            {person.quote && (
              <Text style={[t.type('body'), {
                color: t.color.textPrimary, marginTop: t.space[2],
              }]}>
                "{person.quote}"
              </Text>
            )}
          </Card>
        ) : !loading && (
          <Card>
            <Text style={[t.type('h2'), { color: t.color.textPrimary }]}>
              A place for her
            </Text>
            <Text style={[t.type('body'), {
              color: t.color.textSecondary, marginTop: t.space[2],
            }]}>
              Her voice, her recipes, the way she did her liner. Kept safely,
              for whenever you want them.
            </Text>
            <View style={{ marginTop: t.space[4] }}>
              <PrimaryButton title="Add someone" onPress={addPerson} />
            </View>
          </Card>
        )}

        {/* ── The Vault ───────────────────────────────────────────── */}
        {person && (
          <Section title={`THE VAULT · ${items.length} item${items.length === 1 ? '' : 's'}`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] }}>
              {VAULT_KINDS.map((k) => {
                const n = items.filter((i) => i.kind === k.key).length;
                const writable = VAULT_TEXT_KINDS.includes(k.key) && !vault.readOnly;
                return (
                  <Card
                    key={k.key}
                    style={{ minWidth: 92, opacity: writable || n ? 1 : 0.6 }}
                    onPress={writable ? () => addItem(k.key) : undefined}
                  >
                    <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>
                      {k.icon} {k.label}
                    </Text>
                    <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                      {n > 0 ? n : writable ? '+ add' : 'phone app'}
                    </Text>
                  </Card>
                );
              })}
            </View>

            {items.map((i) => {
              const k = VAULT_KINDS.find((v) => v.key === i.kind);
              return (
                <Card key={i.id}>
                  <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
                    {k?.icon} {k?.label?.toUpperCase()}
                  </Text>
                  {!!i.body && (
                    <Text style={[t.type('body'), { color: t.color.textPrimary, marginTop: 4 }]}>
                      {i.body}
                    </Text>
                  )}
                  {!!i.caption && (
                    <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                      {i.caption}
                    </Text>
                  )}
                  <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
                    {formatDate(i.createdAt)}
                  </Text>
                </Card>
              );
            })}

            {vault.readOnly && (
              <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                Your vault is full at {vault.limit}. Nothing has been removed —
                everything you've saved stays exactly where it is.
              </Text>
            )}
          </Section>
        )}

        {/* ── Letters Forward ─────────────────────────────────────── */}
        <Section title="LETTERS FORWARD">
          {letters.delivered.map((l) => (
            <Card key={l.id}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                💌 {l.occasion}
              </Text>
              {!!l.body && (
                <Text style={[t.type('body'), { color: t.color.textPrimary, marginTop: t.space[2] }]}>
                  {l.body}
                </Text>
              )}
              <Text style={[t.type('caption'), { color: t.color.textSecondary, marginTop: 4 }]}>
                arrived {formatDate(l.deliveredAt)}
              </Text>
            </Card>
          ))}

          {outbox.map((l) => {
            const to = children.find((c) => c.id === l.toProfileId);
            return (
              <Card key={`out-${l.id}`}>
                <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                  🔒 {l.occasion}
                </Text>
                <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                  {to ? `for ${to.displayName} · ` : ''}opens {formatDate(l.deliverOn)} · sealed, even to you
                </Text>
              </Card>
            );
          })}

          {letters.sealed.map((l) => (
            <Card key={l.id}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                🔒 {l.occasion}
              </Text>
              <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                opens {formatDate(l.deliverOn)}
              </Text>
            </Card>
          ))}

          {!letters.sealed.length && !letters.delivered.length && !outbox.length && !loading && (
            <Card>
              <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
                Nothing waiting yet.
              </Text>
            </Card>
          )}

          {/* A letter needs someone to be for. Adults with no child yet are
              pointed at the one place that fixes that, not left at a dead end. */}
          {isAdult && children.length === 0 && !loading && (
            <SecondaryButton title="Add your daughter to write her one"
              onPress={() => navigation?.navigate('GuardianConsole')} />
          )}
          {isAdult && children.length > 0 && can('legacy.letters') && (
            <PrimaryButton title={`Write a letter forward for ${children[0].displayName}`}
              onPress={writeLetter} />
          )}

          {!can('legacy.letters') && (
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              Letters already recorded always arrive — at any plan, even a
              cancelled one. That never changes.
            </Text>
          )}
        </Section>

        {/* ── The Healing Journal ─────────────────────────────────── */}
        {/* Native only. The card below claims we hold no key and could not read
            an entry if asked — true on a phone, where the key sits in the OS
            keychain, and NOT true in a browser, which has no keychain. So on
            web the journal is absent with its reason rather than present and
            quietly weaker. utils/config.js -> journalAvailable. */}
        {!journalAvailable ? (
          <Section title="HEALING JOURNAL">
            <Card>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                Not here — on purpose.
              </Text>
              <Text style={[t.type('bodySm'), {
                color: t.color.textSecondary, marginTop: t.space[2],
              }]}>
                {JOURNAL_UNAVAILABLE_REASON}
              </Text>
            </Card>
          </Section>
        ) : (
        <Section title="HEALING JOURNAL">
          <Card>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              {prompt.text}
            </Text>
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: t.space[2],
            }]}>
              Locked on this phone. We store it encrypted and hold no key —
              we could not read it if we were asked to.
            </Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: t.space[3] }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                title="Write"
                onPress={() => writeEntry(prompt.id, load, !keyExists)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton title="Just sit with it" ghost
                onPress={() => sitWithIt(prompt.id)} />
            </View>
          </View>

          {entries.map((e) => (
            <Card key={e.id}>
              {e.presenceOnly ? (
                <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                  You sat with it. {formatDate(e.createdAt)}
                </Text>
              ) : e.text === null ? (
                <>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    🔒 Written on a device you no longer have.
                  </Text>
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    {formatDate(e.createdAt)} · the key stayed on that phone
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                    {e.text}
                  </Text>
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    {formatDate(e.createdAt)}
                  </Text>
                </>
              )}
            </Card>
          ))}
        </Section>
        )}

        {/* Persistent and region-aware. Always visible in this module. */}
        <Pressable
          onPress={talkToSomeone}
          accessibilityRole="link"
          accessibilityLabel="Talk to someone — opens a helpline"
          style={{ minHeight: t.tapTarget, justifyContent: 'center' }}
        >
          <Text style={[t.type('body'), { color: t.color.accent, textAlign: 'center' }]}>
            💬 Talk to someone
          </Text>
        </Pressable>

        <Text style={[t.type('caption'), {
          color: t.color.textSecondary, textAlign: 'center',
        }]}>
          {COPY.legacyEntry}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Entries are encrypted on this device with a key held in the OS keychain.
 * The server receives bytes it cannot read and has no key to ask for.
 *
 * The trade is real and is said out loud before the first entry: a key that
 * never leaves the phone cannot be recovered, so a reinstall means these words
 * are gone. Nobody is told that after the fact.
 */
async function writeEntry(promptId, reload, firstEntry) {
  if (firstEntry) {
    const understood = await dialog.confirm(
      'Before you write',
      'Your journal is locked with a key that stays on this phone. '
      + 'Nobody can read it — not your family, not us.\n\n'
      + "That also means if you reinstall the app or change phones, what you "
      + "write here can't be recovered. By anyone.",
      { ok: 'I understand', cancel: 'Not now' },
    );
    if (!understood) return;
  }

  const text = await dialog.prompt(
    'Write it down',
    'Only you will ever read this.',
    { placeholder: 'Whatever is there', ok: 'Keep it', multiline: true },
  );
  if (!text) return;
  try {
    const { ciphertext, keyId } = await encryptEntry(text);
    await api.post('/journal', { ciphertext, keyId, promptId });
    reload();
  } catch {
    dialog.alert('Journal', "That didn't save. Your words are still here.");
  }
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Section({ title, children }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[3] }}>
      <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}
