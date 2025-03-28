import type { SizeInfo } from './types';
import { addOption, BooleanOption, NumberOption, SliderOption } from './settings';
// Automatically resize the canvas to fit the window
// and maintain the aspect ratio of the game grid

const resize = async () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width / size) * size;
    canvas.height = Math.floor(height / size) * size;
    rows = Math.floor(canvas.height / size);
    columns = Math.floor(canvas.width / size);
    resizeCallbacks.forEach((callback) =>
        callback({
            width: canvas.width,
            height: canvas.height,
            rows: rows,
            columns: columns,
        })
    );
};
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

const resizeCallbacks: ((size: SizeInfo) => void)[] = [];
export const onResize = (callback: (size: SizeInfo) => void) => {
    callback({
        width: canvas.width,
        height: canvas.height,
        rows: rows,
        columns: columns,
    });
    resizeCallbacks.push(callback);
};

// Game configuration settings
export const size = 60;
export const animationSpeed = 5; // Controls overall animation speed

// Get canvas and context
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

// Grid dimensions
export let rows = Math.floor(canvas.height / size);
export let columns = Math.floor(canvas.width / size);
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
        radius: 8,
    },
    crt: {
        enabled: false,
        scanlineIntensity: 0.1,
        curvature: 0.2,
        flickerIntensity: 0.03,
        noiseIntensity: 0.1,
    },
};

// Create offscreen canvas for effect rendering
export const bloomCanvas = document.createElement('canvas');
bloomCanvas.width = canvas.width;
bloomCanvas.height = canvas.height;
onResize((size) => {
    bloomCanvas.width = size.width;
    bloomCanvas.height = size.height;
});
export const bloomCtx = bloomCanvas.getContext(
    '2d'
) as CanvasRenderingContext2D;

export let AI_ENABLED = false; // Enable or disable AI
export function toggleAI(enabled?: boolean) {
    enabled = enabled !== undefined ? !AI_ENABLED : AI_ENABLED;
    AI_ENABLED = enabled;
}

// Timing settings
export let GAME_TICK_INTERVAL = 400; // Define your target FPS
export const TARGET_FPS = 60; // or whatever frame rate you want
export const FRAME_INTERVAL = 1000 / TARGET_FPS; // milliseconds per frame

export const GAME_TICK_INTERVAL_OPTION = new NumberOption(
    'game_tick_interval',
    'Game Tick Interval',
    GAME_TICK_INTERVAL,
    1,
    1000,
);

GAME_TICK_INTERVAL_OPTION.onChange((value) => {
    console.log('Game tick interval changed to:', value);
    GAME_TICK_INTERVAL = value;
});

addOption(GAME_TICK_INTERVAL_OPTION);