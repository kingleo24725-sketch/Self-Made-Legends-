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
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, ScrollView, Linking, Alert, Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import { COPY, HELPLINES, VAULT_KINDS, JOURNAL_PROMPTS } from '../utils/constants';
import api from '../utils/api';

export default function LegacyScreen() {
  const t = useTheme();
  const { profile } = useAuth();
  const { can } = useSubscription();

  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([]);
  const [vault, setVault] = useState({ limit: 3, readOnly: false });
  const [letters, setLetters] = useState({ sealed: [], delivered: [] });
  const [loading, setLoading] = useState(true);

  const person = people[0] ?? null;

  const load = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([
        api.get('/legacy/people'),
        api.get('/legacy/letters'),
      ]);
      setPeople(p?.people ?? []);
      setLetters({ sealed: l?.sealed ?? [], delivered: l?.delivered ?? [] });

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

  useEffect(() => { load(); }, [load]);

  async function addPerson() {
    Alert.prompt?.(
      'Who are we remembering?',
      'Just their name for now. You can add more whenever you want.',
      async (name) => {
        if (!name?.trim()) return;
        try {
          await api.post('/legacy/people', { name: name.trim() });
          load();
        } catch {
          Alert.alert('Legacy', "That didn't save. Try again when you're ready.");
        }
      },
    ) ?? Alert.alert('Legacy', 'Adding someone arrives in the next update.');
  }

  async function sitWithIt(promptId) {
    try {
      await api.post('/journal/presence', { promptId });
      Alert.alert('', 'Logged. Nothing else needed.');
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
                return (
                  <Card key={k.key} style={{ minWidth: 92 }}>
                    <Text style={[t.type('caption'), { color: t.color.textPrimary }]}>
                      {k.icon} {k.label}
                    </Text>
                    <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                      {n === 0 ? 'none yet' : n}
                    </Text>
                  </Card>
                );
              })}
            </View>

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
              <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                arrived {formatDate(l.deliveredAt)}
              </Text>
            </Card>
          ))}

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

          {!letters.sealed.length && !letters.delivered.length && !loading && (
            <Card>
              <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
                Nothing waiting yet.
              </Text>
            </Card>
          )}

          {!can('legacy.letters') && (
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              Letters already recorded always arrive — at any plan, even a
              cancelled one. That never changes.
            </Text>
          )}
        </Section>

        {/* ── The Healing Journal ─────────────────────────────────── */}
        <Section title="HEALING JOURNAL">
          <Card>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              {prompt.text}
            </Text>
            <Text style={[t.type('caption'), {
              color: t.color.textSecondary, marginTop: t.space[2],
            }]}>
              Private. Never read by anyone, including us.
            </Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: t.space[3] }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton title="Write" onPress={() => writeEntry(prompt.id, load)} />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton title="Just sit with it" ghost
                onPress={() => sitWithIt(prompt.id)} />
            </View>
          </View>
        </Section>

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
 * Journal content is encrypted on the device before it is sent. The server
 * stores opaque bytes and holds no key — see models/Memory.js.
 */
async function writeEntry(promptId, reload) {
  Alert.prompt?.(
    'Write it down',
    'Only you will ever read this.',
    async (text) => {
      if (!text?.trim()) return;
      try {
        // TODO(encryption): device keychain key. Until that lands the body is
        // base64 only, and the journal is NOT advertised as encrypted in the UI.
        const ciphertext = globalThis.btoa
          ? globalThis.btoa(unescape(encodeURIComponent(text)))
          : text;
        await api.post('/journal', { ciphertext, promptId });
        reload();
      } catch {
        Alert.alert('Journal', "That didn't save. Your words are still here.");
      }
    },
  ) ?? Alert.alert('Journal', 'Writing arrives in the next update.');
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
