/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * ALWAYS a range + confidence, never a single point.
 * Low confidence says so plainly — a wrong shade recommendation is worse than
 * none, and for deep skin tones it is THE trust-killer.
 * Matches sort by ΔE, never by commercial partnership.
 * docs/wireframes.md W-23.
 */
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Cards/Card';
import PrimaryButton from '../components/Buttons/PrimaryButton';
import SecondaryButton from '../components/Buttons/SecondaryButton';
import ShadeSwatch from '../components/Cards/ShadeSwatch';
import { COPY } from '../utils/constants';
import api from '../utils/api';

export default function ShadeMatchScreen() {
  const t = useTheme();
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  async function scan() {
    setScanning(true);
    try {
      const r = await api.post('/tryon/shade', {});
      setResult(r);
    } catch {
      setResult(null);
    } finally { setScanning(false); }
  }

  const lowConfidence = result && result.confidence < 0.6;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.ground }}>
      <ScrollView contentContainerStyle={{ padding: t.gutter, gap: t.space[4] }}>
        <Text style={[t.type('h1'), { color: t.color.textPrimary }]}>Shade Match</Text>

        {!result && (
          <>
            <Card onPress={scan}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                📷 Scan my skin
              </Text>
              <Text style={[t.type('caption'), { color: t.color.accent }]}>Recommended</Text>
            </Card>
            <Card onPress={() => {}}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>🎚 Pick by eye</Text>
            </Card>
            <Card onPress={() => {}}>
              <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                🔁 Match a foundation I own
              </Text>
            </Card>
            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              Face a window. No filters. No makeup on your jaw.
            </Text>
            <PrimaryButton title={scanning ? 'Scanning…' : 'Start scan'} loading={scanning}
              onPress={scan} />
          </>
        )}

        {lowConfidence && (
          <Card>
            <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
              {COPY.lowConfidenceMatch}
            </Text>
            <SecondaryButton title="Re-scan" onPress={scan} style={{ marginTop: t.space[3] }} />
          </Card>
        )}

        {result && !lowConfidence && (
          <>
            <Card>
              <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
                YOUR SHADE PROFILE
              </Text>
              <View style={{ flexDirection: 'row', gap: t.space[3], alignItems: 'center',
                             marginTop: t.space[2] }}>
                <ShadeSwatch hex={t.color.shadeScale[(result.depthMin ?? 9) - 1]}
                  depth={result.depthMin} undertone={result.undertone} />
                <View>
                  {/* Range, not a point. */}
                  <Text style={[t.type('body'), { color: t.color.textPrimary }]}>
                    Depth {result.depthMin}–{result.depthMax}
                  </Text>
                  <Text style={[t.type('bodySm'), { color: t.color.textSecondary }]}>
                    Undertone: {result.undertone}
                  </Text>
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    Confidence {Math.round((result.confidence ?? 0) * 100)}%
                  </Text>
                </View>
              </View>
            </Card>

            <Text style={[t.type('overline'), { color: t.color.textSecondary }]}>
              MATCHES BY BRAND
            </Text>
            {(result.matches ?? []).map((m) => (
              <Card key={`${m.brand}-${m.shade}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[t.type('body'), { color: t.color.textPrimary, flex: 1 }]}>
                    {m.brand} · {m.shade}
                  </Text>
                  <Text style={[t.type('caption'), { color: t.color.accent }]}>{m.match}%</Text>
                </View>
                {m.affiliate && (
                  <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
                    Affiliate link
                  </Text>
                )}
              </Card>
            ))}

            <Text style={[t.type('caption'), { color: t.color.textSecondary }]}>
              ⓘ Undertone shifts with season. Re-scan every few months.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
