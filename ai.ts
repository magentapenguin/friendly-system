// snake ai
import { Snake } from './entities/snake';
import type { Apple } from './entities/apple';
import type { Direction, Position } from './types';
import { rows, columns } from './config';

const directions: Direction[] = ['up', 'down', 'left', 'right'];
const oppositeDirections: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};
let previousMoves: Direction[] = [];

function getRandomDirection(exclude: Direction): Direction {
    const availableDirections = directions.filter((dir) => dir !== exclude);
    return availableDirections[
        Math.floor(Math.random() * availableDirections.length)
    ];
}
function getRandomDirectionWithWeight(
    exclude: Direction,
    weightedDirection: Direction,
    weight: number = 0.5
): Direction {
    const randomValue = Math.random();
    if (randomValue < weight) {
        return weightedDirection;
    } else {
        return getRandomDirection(exclude);
    }
}

function moveSnake(snake: Snake[], direction: Direction): Snake[] {
    const newSnake = deepcopySnake(snake);
    const head = getHead(newSnake);

    const newHead = new Snake(head, true); // Create a new head
    newHead.direction = direction; // Set the new direction
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
    if (newHead.x < 0) newHead.x = columns - 1; // Wrap around
    if (newHead.x >= columns) newHead.x = 0; // Wrap around
    if (newHead.y < 0) newHead.y = rows - 1; // Wrap around
    if (newHead.y >= rows) newHead.y = 0; // Wrap around
    newSnake.unshift(newHead); // Add the new head to the front
    newSnake.pop(); // Remove the tail

    return newSnake;
}

export function getBestMove(snake: Snake[], apple: Apple): Direction {
    const lookAhead = Math.max(Math.floor(snake.length / 2), 2); // Look ahead half the snake's length
    const possibleMoves: Direction[] = [];
    const snakeCopy = deepcopySnake(snake);
    const head = getHead(snakeCopy);

    // Check all possible moves
    for (const direction of directions) {
        // Check if the move is valid
        if (!isCollision(snake, direction)) {
            possibleMoves.push(direction);
        }
    }

    // Filter out opposite direction
    const filteredMoves = possibleMoves.filter(
        (move) => move !== oppositeDirections[head.direction]
    );

    let bestMove: Direction | null = null;
    let bestScore = -Infinity;
    console.group('AI: Possible Moves');

    // Use filtered moves if available, otherwise use original possibleMoves
    const movesToEvaluate =
        filteredMoves.length > 0 ? filteredMoves : possibleMoves;

    for (const initialMove of movesToEvaluate) {
        // Simulate the initial move
        let currentSnake = moveSnake(snakeCopy, initialMove);
        let currentScore = 0;

        // Simulate looking ahead
        for (let step = 0; step < lookAhead; step++) {
            const currentHead = getHead(currentSnake);
            const distance =
                Math.abs(currentHead.x - apple.x) +
                Math.abs(currentHead.y - apple.y);

            // Score based on distance (closer is better)
            currentScore -= distance;

            // If we reach the apple, give bonus points and stop simulating
            if (distance === 0) {
                currentScore += 1000;
                break;
            }

            // Find the best next move (the one that gets closest to the apple)
            let bestNextMove: Direction | null = null;
            let bestNextDistance = Infinity;

            for (const nextMove of directions) {
                if (isCollision(currentSnake, nextMove)) continue;

                const nextSnake = moveSnake(currentSnake, nextMove);
                const nextHead = getHead(nextSnake);
                const nextDistance =
                    Math.abs(nextHead.x - apple.x) +
                    Math.abs(nextHead.y - apple.y);

                if (nextDistance < bestNextDistance) {
                    bestNextDistance = nextDistance;
                    bestNextMove = nextMove;
                }
            }

            // If no valid next move, penalize this path
            if (bestNextMove === null) {
                currentScore -= 7000; // Penalize for dead end
                break;
            }

            // Make the best next move
            currentSnake = moveSnake(currentSnake, bestNextMove);
        }

        console.log(`AI: Move ${initialMove} has score ${currentScore}`);
        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMove = initialMove;
        }
    }

    // If no valid moves are found, return a random direction
    if (bestMove === null) {
        console.warn('AI: No valid moves found, returning random direction');
        console.groupEnd();
        return getRandomDirectionWithWeight(
            head.direction,
            oppositeDirections[head.direction]
        );
    }
    console.groupEnd();
    return bestMove;
}

function deepcopySnake(snake: Snake[]): Snake[] {
    return snake.map((s) => new Snake(s, true));
}

function getHead(snake: Snake[]): Snake {
    return snake.at(0) as Snake;
}

export function getNextMove(snake: Snake[], apple: Apple): Direction {
    const directionToApple = getBestMove(snake, apple);

    let nextDirection = directionToApple;

    // Ensure the new direction will not collide with the snake's body
    let iters = 0;
    while (isCollision(snake, nextDirection)) {
        iters++;
        if (iters > 10) {
            console.error('AI: Too many iterations, returning relative right');
            // find a relative right direction
            const currentDirection = snake[0].direction;
            if (currentDirection === 'up') {
                nextDirection = 'right';
            } else if (currentDirection === 'down') {
                nextDirection = 'left';
            } else if (currentDirection === 'left') {
                nextDirection = 'up';
            } else if (currentDirection === 'right') {
                nextDirection = 'down';
            }
            break;
        }
        nextDirection = getRandomDirectionWithWeight(
            snake[0].direction,
            oppositeDirections[snake[0].direction]
        );
        console.log(
            'AI: Collision detected, trying new direction:',
            nextDirection
        );
    }
    previousMoves.push(nextDirection);

    return nextDirection;
}

function isCollision(snake: Snake[], newDirection: Direction): boolean {
    snake = moveSnake(snake, newDirection);
    const head = getHead(snake);

    // Check if the new head position collides with the snake's body
    for (let i = 0; i < snake.length; i++) {
        if (snake[i] === head) {
            continue; // Skip the head itself
        }
        if (snake[i].x === head.x && snake[i].y === head.y) {
            return true; // Collision detected
        }
    }
    return false; // No collision
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
