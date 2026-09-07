/**
 * Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * The one way this app asks a person something.
 *
 * React Native's Alert was used in 26 places. It has two problems that only
 * show up on a device:
 *
 *   - Alert.prompt exists ONLY on iOS. On Android and web it is undefined, so
 *     "Add someone" in the Vault — the whole point of v1 — fell through to a
 *     fallback that said "arrives in the next update". A dead button with a
 *     message that sounded intentional.
 *
 *   - Alert.alert on react-native-web is literally `static alert() {}`. Every
 *     error message and every confirmation silently did nothing in a browser.
 *     The journal's irreversibility notice wrapped it in a Promise that
 *     resolved on a button press; on web the buttons never existed, so it
 *     hung forever.
 *
 * So: one imperative API, one themed host rendered with RN's Modal (which web
 * does implement), every platform the same. Call sites read like Alert did:
 *
 *   await dialog.alert('Saved', 'Your words are in the vault.');
 *   const ok = await dialog.confirm('Delete?', 'This cannot be undone.');
 *   const name = await dialog.prompt('Who are we remembering?', 'Just a name.');
 *
 * Everything returns a Promise that settles when the person answers, so a
 * caller can await it instead of nesting callbacks. Buttons keep Alert's
 * { text, style, onPress } shape so a drop-in rename of Alert.alert is safe.
 */
const listeners = new Set();
const queue = [];

function emit() { listeners.forEach((fn) => fn(queue[0] ?? null)); }

/** DialogHost subscribes here. Exactly one host should be mounted. */
export function subscribe(fn) {
  listeners.add(fn);
  fn(queue[0] ?? null);
  return () => listeners.delete(fn);
}

function enqueue(spec) {
  return new Promise((resolve) => {
    queue.push({ ...spec, resolve });
    if (queue.length === 1) emit();
  });
}

/** Called by the host when the person answers. Advances the queue. */
export function settle(result) {
  const head = queue.shift();
  emit();
  head?.resolve(result);
}

/**
 * dialog.alert(title, message, buttons?)
 * Buttons default to a single "OK". Resolves with the pressed button's text
 * AFTER its onPress (if any) has run — so Alert-style callback code keeps
 * working and await-style code works too.
 */
async function alert(title, message, buttons) {
  const list = (buttons && buttons.length ? buttons : [{ text: 'OK' }])
    .map((b) => ({ style: 'default', ...b }));
  const pressed = await enqueue({ kind: 'alert', title, message, buttons: list });
  const btn = list.find((b) => b.text === pressed);
  if (btn?.onPress) await btn.onPress();
  return pressed;
}

/** dialog.confirm(title, message, { ok, cancel, destructive }) -> boolean */
async function confirm(title, message, { ok = 'OK', cancel = 'Cancel', destructive = false } = {}) {
  const pressed = await enqueue({
    kind: 'alert', title, message,
    buttons: [
      { text: cancel, style: 'cancel' },
      { text: ok, style: destructive ? 'destructive' : 'default' },
    ],
  });
  return pressed === ok;
}

/**
 * dialog.prompt(title, message, { placeholder, ok, cancel, multiline })
 * Resolves with the trimmed text, or null if cancelled or left empty.
 */
async function prompt(title, message, {
  placeholder = '', ok = 'Save', cancel = 'Cancel', multiline = false, defaultValue = '',
  secure = false,
} = {}) {
  const result = await enqueue({
    kind: 'prompt', title, message, placeholder, multiline, defaultValue, secure,
    buttons: [{ text: cancel, style: 'cancel' }, { text: ok, style: 'default' }],
  });
  if (result == null) return null;
  const text = String(result).trim();
  return text.length ? text : null;
}

const dialog = { alert, confirm, prompt };
export default dialog;
