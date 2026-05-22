// snake ai - uses flood-fill space evaluation + wrapped distance for smarter pathing
import { Snake } from './entities/snake';
import type { Apple } from './entities/apple';
import type { Direction } from './types';
import { rows, columns } from './config';

const directions: Direction[] = ['up', 'down', 'left', 'right'];
const oppositeDirections: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};

/**
 * Calculate the shortest Manhattan distance on a wrapping grid.
 */
function wrappedDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    const dx = Math.min(Math.abs(x1 - x2), columns - Math.abs(x1 - x2));
    const dy = Math.min(Math.abs(y1 - y2), rows - Math.abs(y1 - y2));
    return dx + dy;
}

/**
 * Simulate moving the snake in a given direction (with wrapping).
 * Returns a new snake array without mutating the original.
 */
function moveSnake(snake: Snake[], direction: Direction): Snake[] {
    const newSnake = deepcopySnake(snake);
    const head = getHead(newSnake);

    const newHead = new Snake(head, true);
    newHead.direction = direction;
    switch (direction) {
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
    if (newHead.x < 0) newHead.x = columns - 1;
    if (newHead.x >= columns) newHead.x = 0;
    if (newHead.y < 0) newHead.y = rows - 1;
    if (newHead.y >= rows) newHead.y = 0;
    newSnake.unshift(newHead);
    newSnake.pop();

    return newSnake;
}

/**
 * Build a set of occupied positions from the snake body for O(1) lookup.
 */
function buildOccupiedSet(snake: Snake[]): Set<string> {
    const set = new Set<string>();
    for (const segment of snake) {
        set.add(`${segment.x},${segment.y}`);
    }
    return set;
}

/**
 * Flood-fill from the head position to count how many cells are reachable.
 * This tells us how much "breathing room" the snake has after a move.
 * Capped at a maximum to avoid expensive computation on large boards.
 */
function floodFillCount(snake: Snake[]): number {
    const head = getHead(snake);
    const occupied = buildOccupiedSet(snake);
    // Don't count the head itself as blocked
    occupied.delete(`${head.x},${head.y}`);

    const maxCount = Math.min(rows * columns, snake.length * 3 + 20);
    const visited = new Set<string>();
    const queue: [number, number][] = [[head.x, head.y]];
    visited.add(`${head.x},${head.y}`);
    let count = 0;

    while (queue.length > 0 && count < maxCount) {
        const [cx, cy] = queue.shift()!;
        count++;

        for (const [dx, dy] of [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
        ]) {
            let nx = cx + dx;
            let ny = cy + dy;
            // Wrap around
            if (nx < 0) nx = columns - 1;
            if (nx >= columns) nx = 0;
            if (ny < 0) ny = rows - 1;
            if (ny >= rows) ny = 0;

            const key = `${nx},${ny}`;
            if (!visited.has(key) && !occupied.has(key)) {
                visited.add(key);
                queue.push([nx, ny]);
            }
        }
    }

    return count;
}

/**
 * Check if a move results in a collision with the snake's own body.
 */
function isCollision(snake: Snake[], direction: Direction): boolean {
    const moved = moveSnake(snake, direction);
    const head = getHead(moved);

    for (let i = 1; i < moved.length; i++) {
        if (moved[i].x === head.x && moved[i].y === head.y) {
            return true;
        }
    }
    return false;
}

/**
 * Evaluate a move by simulating it and scoring based on:
 * 1. Wrapped distance to the apple (closer = better)
 * 2. Available space via flood-fill (more space = safer)
 * 3. Lookahead simulation for path viability
 */
function evaluateMove(
    snake: Snake[],
    direction: Direction,
    apple: Apple
): number {
    const movedSnake = moveSnake(snake, direction);
    const head = getHead(movedSnake);

    // Base score: negative distance to apple (closer is better)
    const dist = wrappedDistance(head.x, head.y, apple.x, apple.y);

    // Bonus for reaching the apple
    if (dist === 0) {
        return 10000;
    }

    // Flood-fill to measure available space
    const space = floodFillCount(movedSnake);

    // If the available space is less than the snake's length, this is very dangerous
    if (space < snake.length) {
        return -10000 + space;
    }

    // Lookahead: simulate a few more greedy steps toward the apple
    const lookAhead = Math.min(Math.max(Math.floor(snake.length / 2), 3), 8);
    let currentSnake = movedSnake;
    let pathScore = 0;
    let reachedApple = false;

    for (let step = 0; step < lookAhead; step++) {
        let bestNextDir: Direction | null = null;
        let bestNextDist = Infinity;

        for (const nextDir of directions) {
            if (isCollision(currentSnake, nextDir)) continue;
            const nextSnake = moveSnake(currentSnake, nextDir);
            const nextHead = getHead(nextSnake);
            const nextDist = wrappedDistance(
                nextHead.x,
                nextHead.y,
                apple.x,
                apple.y
            );
            if (nextDist < bestNextDist) {
                bestNextDist = nextDist;
                bestNextDir = nextDir;
            }
        }

        if (bestNextDir === null) {
            // Dead end in lookahead — penalize
            pathScore -= 500;
            break;
        }

        currentSnake = moveSnake(currentSnake, bestNextDir);
        if (bestNextDist === 0) {
            reachedApple = true;
            pathScore += 500;
            break;
        }
    }

    // Final score combines:
    // - Distance to apple (weighted heavily, inverted so closer = higher)
    // - Space available (safety factor)
    // - Lookahead path viability
    const maxDist = rows + columns; // approximate max possible wrapped distance
    const distanceScore = (1 - dist / maxDist) * 100;
    const spaceScore = Math.min(space / snake.length, 3) * 30;

    return distanceScore + spaceScore + pathScore + (reachedApple ? 200 : 0);
}

/**
 * Get the best move for the snake AI.
 * Evaluates all valid moves and picks the one with the highest score.
 */
export function getBestMove(snake: Snake[], apple: Apple): Direction {
    const head = getHead(snake);

    // Get all valid (non-colliding) moves
    const validMoves = directions.filter((dir) => !isCollision(snake, dir));

    // Filter out the opposite direction (can't reverse)
    const preferredMoves = validMoves.filter(
        (dir) => dir !== oppositeDirections[head.direction]
    );

    const movesToEvaluate =
        preferredMoves.length > 0 ? preferredMoves : validMoves;

    if (movesToEvaluate.length === 0) {
        // No valid moves at all — just go forward
        return head.direction;
    }

    let bestMove: Direction = movesToEvaluate[0];
    let bestScore = -Infinity;

    for (const move of movesToEvaluate) {
        const score = evaluateMove(snake, move, apple);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function deepcopySnake(snake: Snake[]): Snake[] {
    return snake.map((s) => new Snake(s, true));
}

function getHead(snake: Snake[]): Snake {
    return snake.at(0) as Snake;
}

/**
 * Main entry point for the AI. Returns the best direction to move.
 */
export function getNextMove(snake: Snake[], apple: Apple): Direction {
    return getBestMove(snake, apple);
}

export function directionToKey(direction: Direction): string {
    switch (direction) {
        case 'up':
            return 'ArrowUp';
        case 'down':
            return 'ArrowDown';
        case 'left':
            return 'ArrowLeft';
        case 'right':
            return 'ArrowRight';
        default:
            return '';
    }
}
