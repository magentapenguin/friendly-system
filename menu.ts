import { Direction } from './types';
import { canvas, ctx, rows, columns } from './config';

// Menu state
export let isMenuActive = true; 
export let isAIActive = true;
export let selectedOption = 0;

// Menu options
const menuOptions = [
    { text: 'Play Game', action: () => startGame() },
    { text: 'AI Demo', action: () => toggleAI() },
    { text: 'Settings', action: () => toggleSettings() }
];

// Settings state
let isSettingsOpen = false;

// Menu styling
const menuStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    titleColor: '#4CFF4C',
    optionColor: 'white',
    selectedOptionColor: '#4CFF4C',
    selectedOptionBackgroundColor: 'rgba(76, 255, 76, 0.2)',
    font: 'Arial',
    titleSize: 48,
    optionSize: 28,
    padding: 20,
    optionPadding: 15
};

// AI Player variables
export const AI = {
    thinkingTime: 0,
    lastMoveTime: 0,
    moveDelay: 150, // milliseconds between decisions
    enabled: true
};

// Function to draw the menu
export function drawMenu() {
    if (!isMenuActive) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Draw semi-transparent background
    ctx.fillStyle = menuStyle.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw title
    ctx.fillStyle = menuStyle.titleColor;
    ctx.font = `${menuStyle.titleSize}px ${menuStyle.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNEK', width / 2, height / 4);
    
    // Draw menu options
    ctx.font = `${menuStyle.optionSize}px ${menuStyle.font}`;
    
    menuOptions.forEach((option, index) => {
        const y = height / 2 + index * (menuStyle.optionSize + menuStyle.optionPadding);
        
        // Highlight selected option
        if (index === selectedOption) {
            ctx.fillStyle = menuStyle.selectedOptionBackgroundColor;
            const textWidth = ctx.measureText(option.text).width;
            const rectWidth = textWidth + menuStyle.padding * 2;
            const rectHeight = menuStyle.optionSize + menuStyle.padding;
            const rectX = width / 2 - rectWidth / 2;
            const rectY = y - rectHeight / 2;
            
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            ctx.fillStyle = menuStyle.selectedOptionColor;
        } else {
            ctx.fillStyle = menuStyle.optionColor;
        }
        
        ctx.fillText(option.text, width / 2, y);
    });

    // Show AI status if on AI Demo option
    if (selectedOption === 1) {
        const aiStatusText = isAIActive ? "AI: Enabled" : "AI: Disabled";
        ctx.font = `18px ${menuStyle.font}`;
        ctx.fillStyle = isAIActive ? '#4CFF4C' : '#FF4C4C';
        ctx.fillText(aiStatusText, width / 2, height / 2 + menuOptions.length * (menuStyle.optionSize + menuStyle.optionPadding) + 20);
    }
}

// Function to handle menu input
export function handleMenuInput(e: KeyboardEvent) {
    if (!isMenuActive) return;
    
    switch (e.key) {
        case 'ArrowUp':
            selectedOption = (selectedOption - 1 + menuOptions.length) % menuOptions.length;
            break;
        case 'ArrowDown':
            selectedOption = (selectedOption + 1) % menuOptions.length;
            break;
        case 'Enter':
        case ' ':
            menuOptions[selectedOption].action();
            break;
    }
}

// Menu option actions
function startGame() {
    isMenuActive = false;
    isAIActive = false;
}

function toggleAI() {
    isAIActive = !isAIActive;
}

function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
}

// AI logic for controlling the snake
export function aiThink(snakeBody: any[], apples: any[], inputQueue: string[]) {
    if (!isAIActive) return;
    
    const now = Date.now();
    if (now - AI.lastMoveTime < AI.moveDelay) return;
    AI.lastMoveTime = now;
    
    const head = snakeBody[0];
    const apple = findClosestApple(head, apples);
    
    if (!apple) return;
    
    // Calculate direction to move
    const currentDirection = head.direction;
    const desiredDirection = calculateBestMove(head, apple, snakeBody, currentDirection);
    
    // Add to input queue if it's a valid move
    if (desiredDirection) {
        switch (desiredDirection) {
            case 'up':
                if (currentDirection !== 'down') inputQueue.push('ArrowUp');
                break;
            case 'down':
                if (currentDirection !== 'up') inputQueue.push('ArrowDown');
                break;
            case 'left':
                if (currentDirection !== 'right') inputQueue.push('ArrowLeft');
                break;
            case 'right':
                if (currentDirection !== 'left') inputQueue.push('ArrowRight');
                break;
        }
    }
}

// Find the closest apple to the snake head
function findClosestApple(head: any, apples: any[]) {
    if (apples.length === 0) return null;
    
    let closestApple = apples[0];
    let closestDistance = calculateDistance(head.x, head.y, apples[0].x, apples[0].y);
    
    for (let i = 1; i < apples.length; i++) {
        if (apples[i].eaten) continue;
        
        const distance = calculateDistance(head.x, head.y, apples[i].x, apples[i].y);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestApple = apples[i];
        }
    }
    
    return closestApple;
}

// Calculate Euclidean distance
function calculateDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Calculate the best move to reach the target
function calculateBestMove(head: any, target: any, snakeBody: any[], currentDirection: Direction): Direction | null {
    // Create a grid to represent the game board
    const grid = Array(rows).fill(0).map(() => Array(columns).fill(0));
    
    // Mark snake body positions as obstacles
    for (let i = 1; i < snakeBody.length; i++) {
        grid[snakeBody[i].y][snakeBody[i].x] = 1;
    }
    
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    
    // First, try direct horizontal or vertical movement if it's safe
    if (Math.abs(dx) > Math.abs(dy)) {
        // Try horizontal movement first
        if (dx > 0 && currentDirection !== 'left' && isSafeMove(head.x + 1, head.y, grid)) {
            return 'right';
        } else if (dx < 0 && currentDirection !== 'right' && isSafeMove(head.x - 1, head.y, grid)) {
            return 'left';
        }
        
        // Try vertical movement if horizontal isn't possible
        if (dy > 0 && currentDirection !== 'up' && isSafeMove(head.x, head.y + 1, grid)) {
            return 'down';
        } else if (dy < 0 && currentDirection !== 'down' && isSafeMove(head.x, head.y - 1, grid)) {
            return 'up';
        }
    } else {
        // Try vertical movement first
        if (dy > 0 && currentDirection !== 'up' && isSafeMove(head.x, head.y + 1, grid)) {
            return 'down';
        } else if (dy < 0 && currentDirection !== 'down' && isSafeMove(head.x, head.y - 1, grid)) {
            return 'up';
        }
        
        // Try horizontal movement if vertical isn't possible
        if (dx > 0 && currentDirection !== 'left' && isSafeMove(head.x + 1, head.y, grid)) {
            return 'right';
        } else if (dx < 0 && currentDirection !== 'right' && isSafeMove(head.x - 1, head.y, grid)) {
            return 'left';
        }
    }
    
    // If we can't move directly toward the apple, try any safe move
    if (currentDirection !== 'down' && isSafeMove(head.x, head.y - 1, grid)) return 'up';
    if (currentDirection !== 'up' && isSafeMove(head.x, head.y + 1, grid)) return 'down';
    if (currentDirection !== 'right' && isSafeMove(head.x - 1, head.y, grid)) return 'left';
    if (currentDirection !== 'left' && isSafeMove(head.x + 1, head.y, grid)) return 'right';
    
    // If no safe move is found, continue in the current direction
    return currentDirection;
}

// Check if a move is safe (doesn't collide with the snake body)
function isSafeMove(x: number, y: number, grid: number[][]) {
    // Check if position is out of bounds (wrap around)
    if (x < 0) x = columns - 1;
    if (x >= columns) x = 0;
    if (y < 0) y = rows - 1;
    if (y >= rows) y = 0;
    
    // Check if there's a snake body part at this position
    return grid[y][x] !== 1;
}