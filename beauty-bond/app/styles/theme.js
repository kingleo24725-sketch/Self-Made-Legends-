/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
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
                             reduceMotion = false } = {}) {

  return {
    scheme,
    mode,
    isChild,
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
    motion: reduceMotion
      ? Object.fromEntries(Object.keys(layout.motion).map((k) => [k, 150]))
      : layout.motion,
    reduceMotion,
  };
}

export default buildTheme;
