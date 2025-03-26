import { Apple } from './entities/apple';
import { Snake } from './entities/snake';
import {
    AI_ENABLED,
    bloomCanvas,
    bloomCtx,
    canvas,
    columns,
    visualEffects as configVisualEffects,
    ctx,
    FRAME_INTERVAL,
    GAME_TICK_INTERVAL,
    GAMEPAD_COOLDOWN,
    GAMEPAD_DEADZONE,
    INPUT_DISPLAY_DURATION,
    MIN_SWIPE_DISTANCE,
    rows,
    size,
    toggleAI
} from './config';
import * as AI from './ai';

// Game state
let gameOver = false;
let gameOverProgress = 0;
let score = 0;
let flashEffect = false;
let flashIntensity = 0;

// Visual effects settings - use the settings from config
const visualEffects = configVisualEffects;

// Settings UI elements
const bloomToggle = document.getElementById('bloom-toggle') as HTMLInputElement;
const crtToggle = document.getElementById('crt-toggle') as HTMLInputElement;
const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement;
if (localStorage.aiEnabled) {
    aiToggle.checked = JSON.parse(localStorage.aiEnabled);
    toggleAI(aiToggle.checked);
}
if (localStorage.bloomEnabled) {
    bloomToggle.checked = JSON.parse(localStorage.bloomEnabled);
}
if (localStorage.crtEnabled) {
    crtToggle.checked = JSON.parse(localStorage.crtEnabled);
}


// Initialize toggle states based on current settings
bloomToggle.checked = visualEffects.bloom.enabled;
crtToggle.checked = visualEffects.crt.enabled;

// Add event listeners for toggles
bloomToggle.addEventListener('change', () => {
    visualEffects.bloom.enabled = bloomToggle.checked;
});

crtToggle.addEventListener('change', () => {
    visualEffects.crt.enabled = crtToggle.checked;
});

aiToggle.addEventListener('change', () => {
    toggleAI(aiToggle.checked);
    if (AI_ENABLED) {
        // Reset the snake to start AI mode
        resetGame();
    }
})

// Add click handlers for toggle sliders
document.querySelectorAll('.toggle-slider').forEach((slider, index) => {
    slider.addEventListener('click', () => {
        // Find the associated checkbox
        const checkbox = slider.previousElementSibling as HTMLInputElement;
        // Toggle the checkbox
        checkbox.checked = !checkbox.checked;

        // Trigger the change event
        const changeEvent = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(changeEvent);
    });
});

// Create offscreen canvases for effect rendering
bloomCanvas.width = canvas.width;
bloomCanvas.height = canvas.height;

// Score animation
let displayScore = 0;
let scoreAnimationActive = false;
let scoreAnimationTime = 0;
let scoreAnimationPosition = { x: 0, y: 0 };

// Particle system
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    size: number;
}

const particles: Particle[] = [];

function createParticles(x: number, y: number, amount: number, color: string) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: x * size + size / 2,
            y: y * size + size / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: color,
            life: 1,
            size: Math.random() * 5 + 2,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Apply gravity
        p.vy += 0.1;

        // Reduce life
        p.life -= 0.02;

        // Remove dead particles
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        // Draw particle
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawBackground() {
    // Draw background grid with animation
    const time = Date.now() / 1000;
    ctx.strokeStyle = `rgba(200, 200, 200, ${0.1 + Math.sin(time) * 0.05})`;
    ctx.lineWidth = 0.5;

    // Animated grid
    for (let x = 0; x <= columns; x++) {
        ctx.beginPath();
        ctx.moveTo(x * size, 0);
        ctx.lineTo(x * size, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * size);
        ctx.lineTo(canvas.width, y * size);
        ctx.stroke();
    }

    // Flash effect when eating an apple
    if (flashEffect) {
        ctx.fillStyle = `rgba(255, 255, 0, ${flashIntensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashIntensity -= 0.05;
        if (flashIntensity <= 0) {
            flashEffect = false;
        }
    }
}

function drawUI() {
    const time = Date.now() / 1000;

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${Math.floor(displayScore)}`, 10, 10);

    // Draw controls help if not in game over state
    if (!gameOver) {
        // Show last used input method
        ctx.font = '13px Arial';
        ctx.textAlign = 'right';
        if (Date.now() - lastInputTime < INPUT_DISPLAY_DURATION) {
            // highlight the last used input method
            let index = 0;
            let length = 0;
            switch (lastInputMethod) {
                case 'arrowKeys':
                    index =
                        'Controls: Arrow Keys / WASD / Swipe / Gamepad'.indexOf(
                            ' Arrow Keys '
                        );
                    length = ' Arrow Keys '.length;
                    break;
                case 'wasd':
                    index =
                        'Controls: Arrow Keys / WASD / Swipe / Gamepad'.indexOf(
                            ' WASD '
                        );
                    length = ' WASD '.length;
                    break;
                case 'touch':
                    index =
                        'Controls: Arrow Keys / WASD / Swipe / Gamepad'.indexOf(
                            ' Swipe '
                        );
                    length = ' Swipe '.length;
                    break;
                case 'gamepad':
                    index =
                        'Controls: Arrow Keys / WASD / Swipe / Gamepad'.indexOf(
                            ' Gamepad '
                        );
                    length = ' Gamepad '.length;
                    break;
                case 'ai':
                    index =
                        'Controls: Arrow Keys / WASD / Swipe / Gamepad'.indexOf(
                            'Controls: '
                        );
                    length = 'Controls: '.length;
                    break;
            }
            // color, fade out
            if (lastInputDisplay === 'AI') {
                ctx.fillStyle = `rgba(0, 100, 255, ${Math.min(
                    1 - (Date.now() - lastInputTime) / INPUT_DISPLAY_DURATION,
                    0.3
                )})`;
            } else {
                ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(
                    1 - (Date.now() - lastInputTime) / INPUT_DISPLAY_DURATION,
                    0.3
                )})`;
            }
            // find the position of the highlighted text
            const text = 'Controls: Arrow Keys / WASD / Swipe / Gamepad';
            const ypad = 5;
            const textWidth = ctx.measureText(text).width;
            const textHeight =
                ctx.measureText(text).actualBoundingBoxDescent +
                ctx.measureText(text).actualBoundingBoxAscent +
                ypad;
            const x =
                canvas.width -
                10 -
                textWidth +
                ctx.measureText(text.slice(0, index)).width;
            const y = 9 - ypad / 2;
            ctx.fillRect(
                x,
                y,
                ctx.measureText(text.slice(index, index + length)).width,
                textHeight
            );
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(
            'Controls: Arrow Keys / WASD / Swipe / Gamepad',
            canvas.width - 10,
            10
        );
    }

    // Animate score changing
    if (displayScore < score) {
        displayScore = Math.min(score, displayScore + 0.2);
    }

    // Score popup animation
    if (scoreAnimationActive) {
        scoreAnimationTime += 0.05;

        if (scoreAnimationTime >= 1) {
            scoreAnimationActive = false;
        } else {
            ctx.save();
            ctx.globalAlpha = 1 - scoreAnimationTime;
            ctx.fillStyle = 'yellow';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                '+1',
                scoreAnimationPosition.x * size + size / 2,
                scoreAnimationPosition.y * size - 20 * scoreAnimationTime
            );
            ctx.restore();
        }
    }

    // Game over overlay
    if (gameOver) {
        gameOverProgress = Math.min(1, gameOverProgress + 0.02);

        // Darken screen
        ctx.fillStyle = `rgba(0, 0, 0, ${gameOverProgress * 0.7})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Display game over text
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Animated text effect
        const scaleFactor = 1 + Math.sin(time * 3) * 0.1;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2 - 20);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.fillText('GAME OVER', 0, 0);
        ctx.restore();

        // Score
        ctx.font = '24px Arial';
        ctx.fillText(
            `Score: ${score}`,
            canvas.width / 2,
            canvas.height / 2 + 40
        );

        // Restart prompt with blinking effect
        if (Math.sin(time * 5) > 0) {
            ctx.font = '18px Arial';
            ctx.fillText(
                'Press SPACE, Touch, or Gamepad A to restart',
                canvas.width / 2,
                canvas.height / 2 + 95
            );
        }
    }
}

function preDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
}

function inspect() {
    console.log(apples.map((apple) => apple.inspect()));
    console.log(snakeBody.map((body) => body.inspect()));
}

// Track the last used input method
let lastInputMethod = 'keyboard'; // Default to keyboard
let lastInputDisplay = '';
let lastInputTime = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === 'i') {
        inspect();
    }

    if (e.key === ' ' && gameOver) {
        resetGame();
    }
});

function resetGame() {
    // Reset game state
    gameOver = false;
    gameOverProgress = 0;
    score = 0;
    displayScore = 0;

    // Reset snake
    snakeBody.length = 0;
    const snake = new Snake();
    snakeBody.push(snake);

    // Reset apples
    apples.length = 0;
    apples.push(new Apple());

    // Reset particles
    particles.length = 0;
}

const apples = [new Apple()];

const snake = new Snake();
const snakeBody = [snake];

// Gamepad support
let gamepads: Gamepad[] = [];
let gamepadConnected = false;
let gamepadLastUsed = 0;

// Handle gamepad connections and disconnections
window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    gamepadConnected = true;
});

window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected:', e.gamepad.id);
    // Check if any gamepads are still connected
    const gamepads = navigator.getGamepads();
    gamepadConnected = false;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            gamepadConnected = true;
            break;
        }
    }
});

// Process gamepad input
function processGamepadInput() {
    if (!gamepadConnected) return;

    // Get the current timestamp
    const now = Date.now();

    // Don't process input too frequently
    if (now - gamepadLastUsed < GAMEPAD_COOLDOWN) return;

    // Get all connected gamepads
    const rawGamepads = navigator.getGamepads();
    if (!rawGamepads) return;

    // Process each gamepad
    for (let i = 0; i < rawGamepads.length; i++) {
        const gamepad = rawGamepads[i];
        if (!gamepad) continue;

        // Check D-pad buttons (buttons 12-15 are up, down, left, right)
        if (gamepad.buttons[12]?.pressed) {
            // D-pad Up
            inputQueue.push('ArrowUp');
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad D-pad';
            gamepadLastUsed = now;
            return;
        } else if (gamepad.buttons[13]?.pressed) {
            // D-pad Down
            inputQueue.push('ArrowDown');
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad D-pad';
            gamepadLastUsed = now;
            return;
        } else if (gamepad.buttons[14]?.pressed) {
            // D-pad Left
            inputQueue.push('ArrowLeft');
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad D-pad';
            gamepadLastUsed = now;
            return;
        } else if (gamepad.buttons[15]?.pressed) {
            // D-pad Right
            inputQueue.push('ArrowRight');
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad D-pad';
            gamepadLastUsed = now;
            return;
        }

        // Check analog sticks
        // Left analog stick
        if (
            Math.abs(gamepad.axes[0]) > GAMEPAD_DEADZONE ||
            Math.abs(gamepad.axes[1]) > GAMEPAD_DEADZONE
        ) {
            // Update input method
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad Analog';

            // Horizontal movement is stronger
            if (Math.abs(gamepad.axes[0]) > Math.abs(gamepad.axes[1])) {
                if (gamepad.axes[0] < -GAMEPAD_DEADZONE) {
                    inputQueue.push('ArrowLeft');
                    gamepadLastUsed = now;
                    return;
                } else if (gamepad.axes[0] > GAMEPAD_DEADZONE) {
                    inputQueue.push('ArrowRight');
                    gamepadLastUsed = now;
                    return;
                }
            } else {
                // Vertical movement is stronger
                if (gamepad.axes[1] < -GAMEPAD_DEADZONE) {
                    inputQueue.push('ArrowUp');
                    gamepadLastUsed = now;
                    return;
                } else if (gamepad.axes[1] > GAMEPAD_DEADZONE) {
                    inputQueue.push('ArrowDown');
                    gamepadLastUsed = now;
                    return;
                }
            }
        }

        // Check for restart button (usually A button or first action button)
        if (gameOver && gamepad.buttons[0]?.pressed) {
            resetGame();
            lastInputMethod = 'gamepad';
            lastInputTime = now;
            lastInputDisplay = 'Gamepad Button';
            gamepadLastUsed = now;
            return;
        }
    }
}

// Tracking variable for the last frame time
let lastFrameTime = 0;

function draw(timestamp = 0) {
    // Request next frame right away
    requestAnimationFrame(draw);

    // Check if enough time has passed since last frame
    const elapsed = timestamp - lastFrameTime;

    // Only render if enough time has passed
    if (elapsed >= FRAME_INTERVAL) {
        // Update last frame time, accounting for potential drift
        lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

        // Process gamepad input
        processGamepadInput();

        preDraw();

        // Draw and filter out completed eaten animations
        const remainingApples: Apple[] = [];
        for (const apple of apples) {
            apple.draw();
            if (!apple.eaten || apple.eatenProgress < 1) {
                remainingApples.push(apple);
            }
        }

        // Replace the apples array with only the remaining apples
        if (remainingApples.length < apples.length) {
            apples.length = 0;
            apples.push(...remainingApples);
        }

        for (const body of snakeBody.slice().reverse()) {
            body.draw(snakeBody);
        }

        // Update and draw particles
        updateParticles();

        // Visual effects
        // Head glow effect for the snake
        if (snakeBody.length > 0 && !gameOver) {
            const head = snakeBody[0];
            ctx.beginPath();
            ctx.arc(
                head.visualX * size + size / 2,
                head.visualY * size + size / 2,
                size * 0.7 + Math.sin(timestamp * 0.005) * 3,
                0,
                Math.PI * 2
            );
            if (AI_ENABLED) {
                ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
            } else {
                ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
            }
            ctx.fill();
            ctx.closePath();
        }

        drawUI();

        applyBloom();
        applyCrtEffect();

        console.log('FPS:', Math.round(1000 / elapsed));
        console.log('elapsed:', elapsed);

        let fps = Math.round(1000 / elapsed);
        document.getElementById('fps-counter')!.innerText = `${fps}`;
    }
}

// Start the animation loop
draw();

function move() {
    const head = snakeBody[0];
    if (AI_ENABLED) {
        // AI mode
        const bestMove = AI.getNextMove(snakeBody, apples[0]);
        inputQueue.push(AI.directionToKey(bestMove));
        console.log('AI move:', bestMove);
        lastInputMethod = 'ai';
        lastInputTime = Date.now();
        lastInputDisplay = 'AI';
    }
    switch (inputQueue.shift()) {
        case 'ArrowUp':
            if (head.direction !== 'down') {
                head.direction = 'up';
            }
            break;
        case 'ArrowDown':
            if (head.direction !== 'up') {
                head.direction = 'down';
            }
            break;
        case 'ArrowLeft':
            if (head.direction !== 'right') {
                head.direction = 'left';
            }
            break;
        case 'ArrowRight':
            if (head.direction !== 'left') {
                head.direction = 'right';
            }
            break;
    }
    const newHead = new Snake();
    newHead.x = head.x;
    newHead.y = head.y;
    newHead.direction = head.direction;

    // Initialize visual position to the current head's visual position
    // This prevents the teleporting effect
    newHead.visualX = head.visualX;
    newHead.visualY = head.visualY;

    switch (head.direction) {
        case 'up':
            newHead.y -= 1;
            break;
        case 'down':
            newHead.y += 1;
            break;
        case 'left':
            newHead.x -= 1;
            break;
        case 'right':
            newHead.x += 1;
            break;
    }
    snakeBody.unshift(newHead);
    snakeBody.pop();
}

function grow() {
    const tail = snakeBody[snakeBody.length - 1];
    const newTail = new Snake();
    newTail.x = tail.x;
    newTail.y = tail.y;

    // Initialize visual position for new tail segments too
    newTail.visualX = tail.visualX;
    newTail.visualY = tail.visualY;

    snakeBody.push(newTail);

    // Update score
    score++;

    // Trigger score animation
    scoreAnimationActive = true;
    scoreAnimationTime = 0;
    scoreAnimationPosition = { x: snakeBody[0].x, y: snakeBody[0].y };
}

function checkCollision() {
    const head = snakeBody[0];
    let collision = false;

    if (head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows) {
        // move back to the other side
        if (head.x < 0) {
            head.x = columns - 1;
        } else if (head.x >= columns) {
            head.x = 0;
        }
        if (head.y < 0) {
            head.y = rows - 1;
        } else if (head.y >= rows) {
            head.y = 0;
        }
    }

    for (let i = 1; i < snakeBody.length; i++) {
        if (head.x === snakeBody[i].x && head.y === snakeBody[i].y) {
            collision = true;
            head.collided = true;
            snakeBody[i].collided = true;

            // Create explosion particles
            createParticles(head.x, head.y, 30, 'red');
            createParticles(head.x, head.y, 20, 'orange');
            createParticles(head.x, head.y, 15, 'yellow');
            break;
        }
    }

    if (collision && !gameOver) {
        gameOver = true;
    }

    return collision;
}

function checkApple() {
    const head = snakeBody[0];
    for (let i = 0; i < apples.length; i++) {
        if (head.x === apples[i].x && head.y === apples[i].y) {
            grow();
            apples[i].eaten = true;

            // Add new apple
            apples.push(new Apple());

            // Flash effect when eating
            flashEffect = true;
            flashIntensity = 0.3;

            // Create particles
            createParticles(head.x, head.y, 15, 'red');
            createParticles(head.x, head.y, 10, 'gold');
        }
    }
}

var paused = false;

function gameLoop() {
    if (gameOver || paused) return;

    move();
    if (checkCollision()) {
        return;
    }
    checkApple();
}

setInterval(gameLoop, GAME_TICK_INTERVAL);

const inputQueue = [] as string[];
document.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow')) {
        inputQueue.push(e.key);
        lastInputMethod = 'arrowKeys';
        lastInputTime = Date.now();
        lastInputDisplay = 'Arrow Keys';
    }
    if (e.key === 'p') {
        paused = !paused;
    }
    // Add WASD controls
    else if (e.key === 'w' || e.key === 'W') {
        inputQueue.push('ArrowUp');
        lastInputMethod = 'wasd';
        lastInputTime = Date.now();
        lastInputDisplay = 'WASD Keys';
    } else if (e.key === 'a' || e.key === 'A') {
        inputQueue.push('ArrowLeft');
        lastInputMethod = 'wasd';
        lastInputTime = Date.now();
        lastInputDisplay = 'WASD Keys';
    } else if (e.key === 's' || e.key === 'S') {
        inputQueue.push('ArrowDown');
        lastInputMethod = 'wasd';
        lastInputTime = Date.now();
        lastInputDisplay = 'WASD Keys';
    } else if (e.key === 'd' || e.key === 'D') {
        inputQueue.push('ArrowRight');
        lastInputMethod = 'wasd';
        lastInputTime = Date.now();
        lastInputDisplay = 'WASD Keys';
    }
});

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener(
    'touchstart',
    (e) => {
        e.preventDefault(); // Prevent scrolling

        // Store the initial touch position
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    },
    { passive: false }
);

canvas.addEventListener(
    'touchmove',
    (e) => {
        e.preventDefault(); // Prevent scrolling
    },
    { passive: false }
);

canvas.addEventListener(
    'touchend',
    (e) => {
        e.preventDefault(); // Prevent scrolling

        // Get the final touch position
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        // Calculate the distance and direction
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        // Only register as a swipe if moved enough
        if (
            Math.abs(dx) > MIN_SWIPE_DISTANCE ||
            Math.abs(dy) > MIN_SWIPE_DISTANCE
        ) {
            // Update input method
            lastInputMethod = 'touch';
            lastInputTime = Date.now();
            lastInputDisplay = 'Touch';

            // Determine if horizontal or vertical swipe
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (dx > 0) {
                    inputQueue.push('ArrowRight');
                } else {
                    inputQueue.push('ArrowLeft');
                }
            } else {
                // Vertical swipe
                if (dy > 0) {
                    inputQueue.push('ArrowDown');
                } else {
                    inputQueue.push('ArrowUp');
                }
            }
        }

        // Handle restart on game over
        if (gameOver) {
            resetGame();
        }
    },
    { passive: false }
);

// Functions for visual effects
function applyBloom() {
    if (!visualEffects.bloom.enabled) return;

    // Copy the main canvas to bloom canvas
    bloomCtx.clearRect(0, 0, canvas.width, canvas.height);
    bloomCtx.drawImage(canvas, 0, 0);

    // Apply brightness/contrast threshold
    bloomCtx.globalCompositeOperation = 'source-over';
    bloomCtx.filter = `brightness(${
        1 + visualEffects.bloom.strength
    }) contrast(${1 + visualEffects.bloom.threshold})`;
    bloomCtx.drawImage(bloomCanvas, 0, 0);

    // Reset filters
    bloomCtx.filter = 'none';

    // Apply blur
    bloomCtx.globalCompositeOperation = 'source-over';
    bloomCtx.filter = `blur(${visualEffects.bloom.radius}px)`;
    bloomCtx.drawImage(bloomCanvas, 0, 0);
    bloomCtx.filter = 'none';

    // Draw bloom effect back to main canvas
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = visualEffects.bloom.strength;
    ctx.drawImage(bloomCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

function applyCrtEffect() {
    if (!visualEffects.crt.enabled) return;

    const { scanlineIntensity, flickerIntensity, noiseIntensity, curvature } =
        visualEffects.crt;

    // Create an offscreen canvas for the effect - create it once and reuse
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offCtx = offscreenCanvas.getContext('2d');

    if (!offCtx) return;

    // Copy the current canvas to the offscreen canvas
    offCtx.drawImage(canvas, 0, 0);

    // Clear the main canvas for redrawing with effects
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply curvature with ImageData instead of pixel-by-pixel rendering
    const width = canvas.width;
    const height = canvas.height;

    // Draw the main content back to canvas using a simplified distortion approach
    ctx.save();

    // Apply a subtle bulge/curvature effect using canvas transformations instead of per-pixel
    // This is much more efficient than the previous pixel-by-pixel approach
    if (curvature > 0) {
        ctx.drawImage(offscreenCanvas, 0, 0);

        // Apply subtle bulge using a radial gradient for vignette effect
        const gradient = ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            width * 0.7
        );
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${curvature * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        // No curvature, just draw the original content
        ctx.drawImage(offscreenCanvas, 0, 0);
    }

    ctx.restore();

    // Apply scanlines - optimize by drawing fewer, larger rectangles
    if (scanlineIntensity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${scanlineIntensity})`;
        const lineHeight = 2; // Each scanline is 2px (1px line, 1px gap)
        const scanlineCount = Math.floor(height / lineHeight);

        // Draw scanlines in a single pass with a pattern
        ctx.beginPath();
        for (let i = 0; i < scanlineCount; i++) {
            const y = i * lineHeight;
            ctx.rect(0, y, width, 1);
        }
        ctx.fill();
    }

    // Apply noise with a more efficient approach using larger particles
    if (noiseIntensity > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = noiseIntensity;
        ctx.beginPath();

        // Use fewer, larger noise particles (much more efficient)
        const noiseParticles = Math.floor(50 * noiseIntensity);
        for (let i = 0; i < noiseParticles; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            ctx.rect(x, y, size, size);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Apply flicker - this is already efficient
    if (flickerIntensity > 0) {
        const flicker = 1.0 - Math.random() * flickerIntensity;
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - flicker})`;
        ctx.fillRect(0, 0, width, height);
    }
}
