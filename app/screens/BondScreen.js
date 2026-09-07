/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Six sections: Dad Learns Makeup, Daughter Teaches Dad, Bonding Challenges,
 * Memory Gallery, Healing Journal, Mom's Legacy Looks.
 *
 * DUAL-CONFIRM is the whole mechanic — one person cannot complete a challenge
 * alone. docs/wireframes.md W-60.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import { BOND_SECTIONS } from '../utils/constants';
import api from '../utils/api';
import dialog from '../utils/dialog';

const ROUTES = {
  dad_learns: 'DadSchool',
  daughter_teaches: 'DadSchool',
  challenges: null,          // rendered inline below
  memories: 'MemoryGallery',
  journal: 'Legacy',
  legacy: 'Legacy',
};

export default function BondScreen({ navigation }) {
  const t = useTheme();
  // Missions come from the server (backend migration 009 is the catalogue).
  // This screen used to fall back to three hardcoded challenges, two of
  // them drawn as already done — so a brand-new dad was told on day one
  // that he had completed things he had never heard of. No fallback now:
  // an empty list is an empty list, and it says so.
  const [challenges, setChallenges] = useState(null);
  const [bond, setBond] = useState(null);

  const load = useCallback(() => {
    api.get('/bond/missions')
      .then((d) => setChallenges(d?.missions ?? []))
      .catch(() => setChallenges([]));
    api.get('/me/progression')
      .then((d) => setBond(d?.bond ?? null))
      .catch(() => {});
  }, []);
  // On focus, not on mount: a lesson finished under this screen moves the
  // meter, and the person comes back here to see it move.
  useFocusEffect(load);

  async function confirm(id) {
    try {
      // A mission completes only when BOTH halves confirm, so the response
      // carries the authoritative meter — never assume an optimistic one.
      const r = await api.post(`/bond/missions/${id}/confirm`);
      setBond((b) => ({ ...(b ?? {}), meter: r.meter, level: r.level }));
      setChallenges((cs) => cs.map((c) => (c.id === id
        ? { ...c, confirmedBy: r.confirmedBy, confirmedByMe: true, waitingOn: r.waitingOn,
            completedAt: r.complete ? new Date().toISOString() : null }
        : c)));
    } catch (e) {
      if (e?.code === 'no_bond_partner') {
        // A mission is for two. Say who is missing and where to fix it.
        const go = await dialog.confirm('Nobody to bond with yet',
          'Missions are for the two of you, and there is no daughter on this account yet. '
          + 'Add her in the Guardian Console and this will be waiting.',
          { ok: 'Add your daughter', cancel: 'Not now' });
        if (go) navigation.navigate('GuardianConsole');
        return;
      }
      dialog.alert('Missions', "That didn't save. Try again in a moment.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>
          Bonding & Memories
        </Text>

        <Card>
          <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>BOND METER</Text>
          <Text style={[t.type('display'), { color: t.color.accent }]}>
            {bond ? `${bond.meter}` : '—'}
          </Text>
          <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
            {bond
              ? `Level ${bond.level}${bond.partner ? ` · with ${bond.partner.displayName}` : ''}`
              : 'Complete a mission together to start your Bond Meter.'}
          </Text>
        </Card>

        {BOND_SECTIONS.map((section) => {
          if (section.key === 'challenges') {
            return (
              <View key={section.key} style={{ gap: t.space[3] }}>
                <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
                  {section.title.toUpperCase()}
                </Text>

                {challenges && challenges.length === 0 && (
                  <Card>
                    <Text style={[t.type('body'), { color: t.color.textSecondary }]}>
                      No missions this week. New ones arrive here.
                    </Text>
                  </Card>
                )}

                {(challenges ?? []).map((c) => {
                  const done = !!c.completedAt || (c.confirmedBy ?? []).length >= 2;
                  const mine = !!c.confirmedByMe;
                  return (
                    <Card key={c.id}>
                      <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                        {done ? '✅ ' : '○ '}{c.title}
                      </Text>
                      {!!c.description && (
                        <Text style={[t.type('bodySm'), { color: t.color.textSecondary, marginTop: 2 }]}>
                          {c.description}
                        </Text>
                      )}
                      {!done && (
                        <>
                          {/* Name who we're waiting on — gently. */}
                          <Text style={[t.type('caption'), {
                            color: t.color.textSecondary, marginTop: t.space[1],
                          }]}>
                            {mine
                              ? `You did it. Waiting on ${c.waitingOn ?? bond?.partner?.displayName ?? 'her'} ✓`
                              : `Both of you tick it · ${c.points ?? 10} points`}
                          </Text>
                          {!mine && (
                            <SecondaryButton
                              title="I did it ✓"
                              onPress={() => confirm(c.id)}
                              style={{ marginTop: t.space[3] }}
                            />
                          )}
                        </>
                      )}
                    </Card>
                  );
                })}
              </View>
            );
          }

          return (
            <Card
              key={section.key}
              onPress={() => ROUTES[section.key] && navigation.navigate(ROUTES[section.key])}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
                <Text style={{ fontSize: 26 }}>{section.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type('h3'), { color: t.color.textPrimary }]}>
                    {section.title}
                  </Text>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    {section.blurb}
                  </Text>
                </View>
                <Text style={[t.type('h3'), { color: t.color.textSecondary }]}>›</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
