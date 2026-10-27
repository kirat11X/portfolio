// Feel constants for the vehicle, autopilot and camera. Units are world units
// (≈ metres) and seconds. Grouped here so the driving feel can be tuned in one place.

export const VEHICLE = {
  /** Collision circle radius. */
  radius: 0.95,
  /** Top speed without / with boost (units per second). */
  maxSpeed: 12.5,
  boostSpeed: 19,
  maxReverse: 6,
  /** Throttle acceleration (u/s²). */
  accel: 17,
  boostAccel: 26,
  reverseAccel: 11,
  /** Deceleration when pressing against the direction of travel. */
  brake: 34,
  /** Space-bar brake. Also loosens grip a little for playful slides. */
  handbrake: 26,
  /** Rolling resistance when no throttle: constant + proportional part. */
  coastDrag: 3.4,
  linearDrag: 0.32,
  /** Speed above the current cap bleeds off at this rate. */
  overspeedDrag: 9,
  /** Lateral grip: fraction of sideways velocity removed per second. */
  grip: 11,
  handbrakeGrip: 2.6,
  /** Yaw rate at full lock once moving at `steerFullSpeed` or more (rad/s). */
  steerRate: 2.55,
  steerFullSpeed: 4,
  /** Steering authority lost at boost speed (fraction). */
  highSpeedSteerFalloff: 0.38,
  /** Slow turn on the spot so tight corners are forgiving (rad/s). */
  pivotRate: 1.1,
  /** How fast the steering input follows the keys (per second). */
  steerIn: 7.5,
  steerOut: 11,
  /** Fraction of tangential speed kept per second while scraping a wall. */
  wallFriction: 2.2,
  /** Hover height of the body above the ground. */
  hover: 0.3,
} as const;

export const AUTOPILOT = {
  maxSpeed: 10.5,
  /** Planned deceleration used to arrive smoothly. */
  arriveDecel: 7.5,
  /** Waypoints closer than this are considered passed. */
  waypointRadius: 1.7,
  /** Final target tolerance. */
  arriveRadius: 0.6,
  /** Give up if the remaining distance has not improved for this long. */
  stuckSeconds: 1.5,
  /** Steering gain from heading error (radians) to steer input. */
  steerGain: 2.4,
} as const;

export const CAMERA = {
  fov: 42,
  boostFovKick: 4.5,
  near: 0.5,
  far: 230,
  distance: 19,
  pitch: 0.85,
  minZoom: 0.6,
  maxZoom: 1.45,
  /** User orbit limits (radians). */
  maxOrbit: 0.75,
  minPitchOffset: -0.22,
  maxPitchOffset: 0.26,
  /** Highest pitch the occlusion avoidance may use. */
  maxPitch: 1.36,
  /** Damping smooth times (seconds). */
  followSmooth: 0.26,
  lookSmooth: 0.16,
  focusSmooth: 0.55,
  /** Look-ahead per unit of forward speed, clamped. */
  lookAheadPerSpeed: 0.3,
  maxLookAhead: 4.5,
  /** Constant bias of the look target ahead of the vehicle (screen up). */
  lookBias: 1.6,
  /** After quick travel: look further ahead and pull back so the district's sign and doors are in view. */
  arrivalBias: 10.5,
  arrivalZoom: 2.3,
  arrivalPitch: 0.6,
  /** Exhibit framing. */
  focusDistance: 8.6,
  focusHeight: 1.7,
  panelCenterY: 2.3,
  /** Establishing orbit before the visitor enters (around ISLAND_CENTER). */
  orbitRadius: 80,
  orbitHeight: 48,
  orbitSpeed: 0.045,
  /** "Orbit the city" showcase (around ISLAND_CENTER). */
  showcaseRadius: 78,
  showcaseHeight: 42,
  showcaseSecondsPerTurn: 50,
  showcaseSecondsPerTurnReduced: 180,
  introSeconds: 2.4,
  introSecondsReturning: 1.5,
} as const;

export const TRAVEL = {
  fadeOut: 0.17,
  fadeIn: 0.36,
} as const;

/** Pointer movement (px) after which a press becomes a camera drag instead of a click. */
export const DRAG_THRESHOLD_PX = 6;
