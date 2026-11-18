// Keyboard and mouse state. Keys are tracked by code (KeyW, ArrowUp, ...)
// and edge presses (pressed once, then consumed) are exposed for actions
// like E, R, Escape and H.

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys.has(e.code)) justPressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    keys,
    mouse,
    down(code) {
      return keys.has(code);
    },
    // true once per physical press; call once per frame per action
    pressed(code) {
      return justPressed.has(code);
    },
    // WASD / arrows as a -1..1 axis pair
    axis() {
      const x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0)
        - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
      const y = (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0)
        - (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    running() {
      return this.down('ShiftLeft') || this.down('ShiftRight');
    },
    // call at the end of each frame
    endFrame() {
      justPressed.clear();
      mouse.clicked = false;
    },
  };
}
