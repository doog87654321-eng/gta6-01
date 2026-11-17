// Keyboard and mouse, read once a frame. Actions are edge-triggered bits the
// game loop takes and clears; movement is level-triggered.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_INTERACT = 8;
export const ACTION_MUTE = 16;
export const ACTION_RELOAD = 32;

export function createInput(canvas) {
  const held = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let actions = 0;
  let anyKey = false;

  function press(code) {
    if (code === 'Enter' || code === 'Space') actions |= ACTION_CONFIRM;
    if (code === 'Escape' || code === 'KeyP') actions |= ACTION_PAUSE;
    if (code === 'KeyE') actions |= ACTION_ENTER_CAR;
    if (code === 'KeyF') actions |= ACTION_INTERACT;
    if (code === 'KeyM') actions |= ACTION_MUTE;
    if (code === 'KeyR') actions |= ACTION_RELOAD;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    anyKey = true;
    press(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    mouse.down = true;
    mouse.clicked = true;
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    /** -1/0/1 steering and throttle from the held keys, as {steer, drive}. */
    move() {
      const left = held.has('KeyA') || held.has('ArrowLeft');
      const right = held.has('KeyD') || held.has('ArrowRight');
      const up = held.has('KeyW') || held.has('ArrowUp');
      const down = held.has('KeyS') || held.has('ArrowDown');
      return {
        steer: (right ? 1 : 0) - (left ? 1 : 0),
        drive: (up ? 1 : 0) - (down ? 1 : 0),
        run: held.has('ShiftLeft') || held.has('ShiftRight'),
      };
    },
    /** WASD/arrows as a unit vector for walking, or null when no key is held. */
    walkVector() {
      const left = held.has('KeyA') || held.has('ArrowLeft');
      const right = held.has('KeyD') || held.has('ArrowRight');
      const up = held.has('KeyW') || held.has('ArrowUp');
      const down = held.has('KeyS') || held.has('ArrowDown');
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    shiftHeld() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
    /** True once any key has been pressed (used to unlock audio). */
    anyKeyPressed() {
      return anyKey;
    },
  };
}
