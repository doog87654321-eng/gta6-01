// Keyboard and mouse state. Keys are tracked by code (KeyW, ArrowUp, KeyE,
// Space, ShiftLeft, Escape, KeyR, KeyM, KeyH). `pressed` holds the codes
// that went down since the last frame — the loop clears it every frame.

export const keys = new Set();
export const pressedKeys = new Set();
export const mouse = { x: 0, y: 0, down: false, clicked: false };

export function attachInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) pressedKeys.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  // Losing the window must also drop the mouse, or a click held through
  // an alt-tab keeps firing after the player comes back.
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; mouse.clicked = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true;
    mouse.clicked = true;
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
}

export function isDown(code) { return keys.has(code); }
export function wasPressed(code) { return pressedKeys.has(code); }
export function endFrame() { pressedKeys.clear(); mouse.clicked = false; }
