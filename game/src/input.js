// Keyboard + mouse + touch input. One job: turn raw device events into a
// single normalised control frame { steer, climb, boost, pressed } the world
// step consumes. Pointer position steers toward the pointer; keys override.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    steer: 0, // -1 left .. +1 right
    climb: 0, // -1 descend .. +1 climb
    boost: false,
    pointerX: null, // 0..1 across the canvas, null = no pointer steering
    pointerY: null, // 0..1 down the canvas
    pointerActive: false,
    anyKey: false,
  };

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'boost', ShiftLeft: 'boost', ShiftRight: 'boost',
    Enter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
  };

  function onKeyDown(e) {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      keys.add(action);
      state.anyKey = true;
      if (action === 'start' || action === 'pause' || action === 'mute') state[action + 'Pressed'] = true;
    }
  }
  function onKeyUp(e) {
    const action = KEYMAP[e.code];
    if (action) keys.delete(action);
  }
  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function onPointerMove(e) {
    const p = pointerPos(e);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.pointerActive = true;
  }
  function onPointerDown(e) {
    onPointerMove(e);
    state.anyKey = true;
    state.startPressed = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerleave', () => { state.pointerActive = false; });

  // Read the current frame, then clear edge-triggered presses.
  function poll() {
    let steer = 0;
    let climb = 0;
    if (keys.has('left')) steer -= 1;
    if (keys.has('right')) steer += 1;
    if (keys.has('up')) climb += 1;
    if (keys.has('down')) climb -= 1;
    // Pointer steering: fly toward the pointer, dead zone in the middle.
    if (state.pointerActive && state.pointerX !== null && steer === 0) {
      const dx = state.pointerX - 0.5;
      if (Math.abs(dx) > 0.04) steer = Math.max(-1, Math.min(1, dx * 3.2));
    }
    if (state.pointerActive && state.pointerY !== null && climb === 0) {
      const dy = 0.5 - state.pointerY;
      if (Math.abs(dy) > 0.05) climb = Math.max(-1, Math.min(1, dy * 2.6));
    }
    const frame = {
      steer,
      climb,
      boost: keys.has('boost'),
      startPressed: !!state.startPressed,
      pausePressed: !!state.pausePressed,
      mutePressed: !!state.mutePressed,
      anyKey: state.anyKey,
    };
    state.startPressed = false;
    state.pausePressed = false;
    state.mutePressed = false;
    state.anyKey = false;
    return frame;
  }

  return { state, poll };
}
