/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * Assembles colors + typography + spacing into one theme object,
 * resolved for the active color scheme and app mode.
 */
import colors from './colors';
import typography from './typography';
import layout from './spacing';

export function buildTheme({ scheme = 'light', mode = 'solo_girl', isChild = false,
                             reduceMotion = false, remembrance = false } = {}) {

  return {
    scheme,
    mode,
    isChild,
    /**
     * Remembrance Mode. docs/wireframes.md:1105 — softens the palette, removes
     * streak pressure, changes empty-state copy.
     *
     * The flag was stored on the profile, toggleable in Settings, and read by
     * nothing at all. It is a grief-aware setting that did not make the app
     * any gentler. These three are what it now actually does.
     */
    remembrance,
    /** Screens check this before showing a streak, a count, or a nudge. */
    suppressStreaks: remembrance,
    color: {
      ...colors.brand,
      ...colors.accent,
      ground: colors.surface.ground[scheme],
      raised: colors.surface.raised[scheme],
      textPrimary: colors.surface.textPrimary[scheme],
      textSecondary: colors.surface.textSecondary[scheme],
      border: colors.surface.border[scheme],
      success: colors.semantic.success[scheme],
      warning: colors.semantic.warning[scheme],
      danger: colors.semantic.danger[scheme],
      info: colors.semantic.info[scheme],
      accent: colors.modeAccent[mode]?.accent ?? colors.brand.roseGold,
      gradient: colors.modeAccent[mode]?.gradient ?? colors.modeAccent.solo_girl.gradient,
      onAccent: colors.onRoseGold,
      shadeScale: colors.shadeScale,
    },
    type: (name) => typography.type(name, isChild ? 'child' : mode),
    space: layout.space,
    radius: layout.radius,
    elevation: layout.elevation,
    gutter: isChild ? layout.gutter.child : layout.gutter.default,
    tapTarget: isChild ? layout.tapTarget.child : layout.tapTarget.default,
    controlHeight: layout.controlHeight,
    // prefers-reduced-motion: transitions collapse to 150ms fades.
    // Remembrance slows them instead — nothing in this app should bounce at
    // someone who has just told us they are grieving.
    motion: reduceMotion
      ? Object.fromEntries(Object.keys(layout.motion).map((k) => [k, 150]))
      : remembrance
        ? Object.fromEntries(Object.entries(layout.motion)
            .map(([k, v]) => [k, Math.round(v * 1.4)]))
        : layout.motion,
    reduceMotion,
  };
}

export default buildTheme;
