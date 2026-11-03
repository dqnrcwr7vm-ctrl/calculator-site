// Approved world-space summon anchors, shared by every dungeon and mechanic preview.
window.MechFormation = {
  rivet: { x: 390, y: 425 },
  bulwark: { x: 800, y: 545 },
  swat: { x: 640, y: 545 },
  mole: { x: 850, y: 690 },
  alignRivet(mechanic) {
    if (!mechanic || !window.matchMedia?.('(pointer: coarse)').matches) return;
    // Leave room for the turret's left tread even in the outermost roster slot.
    this.rivet = { x: Math.max(112, mechanic.x - 120), y: mechanic.y, behindMechanic: true };
  }
};
