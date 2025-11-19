
export const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  crouch: false,
  sprint: false,
  fire: false,
  aim: false,
  reload: false,
  weapon1: false,
  weapon2: false,
  weapon3: false,
  weapon4: false, // Sniper slot
  // Mobile specific
  lookDelta: { x: 0, y: 0 },
  moveVector: { x: 0, y: 0 } // Joystick input (-1 to 1)
};

export const resetControls = () => {
  controls.forward = false;
  controls.backward = false;
  controls.left = false;
  controls.right = false;
  controls.jump = false;
  controls.crouch = false;
  controls.sprint = false;
  controls.fire = false;
  controls.aim = false;
  controls.reload = false;
  controls.weapon1 = false;
  controls.weapon2 = false;
  controls.weapon3 = false;
  controls.weapon4 = false;
  controls.lookDelta = { x: 0, y: 0 };
  controls.moveVector = { x: 0, y: 0 };
};
