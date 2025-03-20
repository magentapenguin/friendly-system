// Game configuration settings
export const size = 60;
export const animationSpeed = 5; // Controls overall animation speed

// Get canvas and context
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

// Grid dimensions
export const rows = Math.floor(canvas.height / size);
export const columns = Math.floor(canvas.width / size);
canvas.width = columns * size;
canvas.height = rows * size;

// Input settings
export const INPUT_DISPLAY_DURATION = 2000; // How long to show the input method (2 seconds)
export const MIN_SWIPE_DISTANCE = 30; // Minimum distance for a swipe to be registered

// Gamepad settings
export const GAMEPAD_DEADZONE = 0.5; // Minimum analog stick movement to register as input
export const GAMEPAD_COOLDOWN = 200; // Milliseconds between gamepad direction changes

// Visual effects settings
export const visualEffects = {
    bloom: {
        enabled: false,
        strength: 0.5,
        threshold: 0.6,
        radius: 8
    },
    crt: {
        enabled: false,
        scanlineIntensity: 0.1,
        curvature: 0.2,
        flickerIntensity: 0.03,
        noiseIntensity: 0.1
    }
};

// Create offscreen canvas for effect rendering
export const bloomCanvas = document.createElement('canvas');
bloomCanvas.width = canvas.width;
bloomCanvas.height = canvas.height;
export const bloomCtx = bloomCanvas.getContext('2d') as CanvasRenderingContext2D;

export const AI_ENABLED = true; // Enable or disable AI

export const GAME_TICK_INTERVAL = 40; // Interval in milliseconds for game ticks