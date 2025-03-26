import { ctx, size, columns, rows, animationSpeed, AI_ENABLED } from '../config';
import { Direction } from '../types';

export class Snake {
    x: number;
    y: number;
    visualX: number; // For smooth animation
    visualY: number; // For smooth animation
    direction: Direction;
    collided: boolean = false;
    shouldHighlight: boolean = false;

    draw(snakeBody: Snake[]) {
        // Smooth movement animation
        const targetX = this.x;
        const targetY = this.y;

        if (this.visualX === undefined) this.visualX = targetX;
        if (this.visualY === undefined) this.visualY = targetY;

        // Smoothly interpolate position with easing
        this.visualX += (targetX - this.visualX) * animationSpeed * 0.1;
        this.visualY += (targetY - this.visualY) * animationSpeed * 0.1;

        const index = snakeBody.indexOf(this);
        // Calculate size modifier based on distance from head
        const sizeModifier = Math.max(0.5, 1 - index * 0.05) - 0.1; // Decrease by 5% per segment, minimum 50% size

        // Add wobble effect to snake body
        const time = Date.now() / 1000;
        const wobble = index > 0 ? Math.sin(time * 5 + index) * 0.1 : 0;

        let adjustedSize = size * sizeModifier;

        // Center the segment in its grid cell
        const offset = (size - adjustedSize) / 2;

        // Pulsing color when collided
        const colorOffset = this.collided
            ? Math.abs(Math.sin(time * 10)) * 255
            : 0;
        let fillColor: string;
        if (AI_ENABLED) {
            fillColor = this.collided
                ? `rgb(${255 - colorOffset}, 0, ${colorOffset})`
                : `rgb(0, 0, ${255 - index * 10})`;
        } else {
            fillColor = this.collided
                ? `rgb(${255 - colorOffset}, ${colorOffset}, 0)`
                : `rgb(0, ${255 - index * 10}, 0)`;
        }

        // Add shadow for 3D effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();

        // Wobble effect for body segments
        const wobbleX = this.visualX + (index > 0 ? wobble : 0);

        ctx.roundRect(
            wobbleX * size + offset + 3,
            this.visualY * size + offset + 3,
            adjustedSize,
            adjustedSize,
            5 * sizeModifier
        );
        ctx.fill();
        ctx.closePath();

        // Actual segment
        ctx.beginPath();
        ctx.fillStyle = fillColor;
        ctx.roundRect(
            wobbleX * size + offset,
            this.visualY * size + offset,
            adjustedSize,
            adjustedSize,
            5 * sizeModifier // Adjust corner radius too
        );
        ctx.fill();
        ctx.closePath();
        if (this.shouldHighlight) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(
                this.visualX * size + size / 2,
                this.visualY * size + size / 2,
                size * 0.5,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.closePath();
        }
        // If this is the head, draw eyes
        if (index === 0) {
            // Direction-based eye positioning
            let eyeOffset1 = { x: 0.25, y: 0.25 };
            let eyeOffset2 = { x: 0.75, y: 0.25 };

            switch (this.direction) {
                case 'up':
                    eyeOffset1 = { x: 0.25, y: 0.25 };
                    eyeOffset2 = { x: 0.75, y: 0.25 };
                    break;
                case 'down':
                    eyeOffset1 = { x: 0.25, y: 0.75 };
                    eyeOffset2 = { x: 0.75, y: 0.75 };
                    break;
                case 'left':
                    eyeOffset1 = { x: 0.25, y: 0.25 };
                    eyeOffset2 = { x: 0.25, y: 0.75 };
                    break;
                case 'right':
                    eyeOffset1 = { x: 0.75, y: 0.25 };
                    eyeOffset2 = { x: 0.75, y: 0.75 };
                    break;
            }

            // Draw eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(
                this.visualX * size + size * eyeOffset1.x,
                this.visualY * size + size * eyeOffset1.y,
                size * 0.15,
                0,
                Math.PI * 2
            );
            ctx.arc(
                this.visualX * size + size * eyeOffset2.x,
                this.visualY * size + size * eyeOffset2.y,
                size * 0.15,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Draw pupils
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(
                this.visualX * size + size * eyeOffset1.x,
                this.visualY * size + size * eyeOffset1.y,
                size * 0.07,
                0,
                Math.PI * 2
            );
            ctx.arc(
                this.visualX * size + size * eyeOffset2.x,
                this.visualY * size + size * eyeOffset2.y,
                size * 0.07,
                0,
                Math.PI * 2
            );
            ctx.fill();

            return;
        }

        // Connect segments with curved lines
        const connectedBody = snakeBody[index - 1];
        if (!connectedBody) return;

        const dist = Math.sqrt(
            Math.pow(this.visualX - connectedBody.visualX, 2) +
                Math.pow(this.visualY - connectedBody.visualY, 2)
        );
        if (dist > 1.5) {
            return;
        }

        ctx.beginPath();
        ctx.moveTo(wobbleX * size + size / 2, this.visualY * size + size / 2);
        ctx.lineTo(
            connectedBody.visualX * size + size / 2,
            connectedBody.visualY * size + size / 2
        );
        ctx.strokeStyle = fillColor;
        // Adjust line width based on segment size
        ctx.lineWidth = size * sizeModifier;
        ctx.stroke();
        ctx.closePath();
    }

    inspect() {
        return {
            x: this.x,
            y: this.y,
            direction: this.direction,
        };
    }

    constructor(previousSnake?: Snake, copy: boolean = false) {
        if (copy) {
            if (!previousSnake) {
                throw new Error('Cannot copy snake without a previous snake');
            }
            this.x = previousSnake.x;
            this.y = previousSnake.y;
            this.visualX = previousSnake.visualX;
            this.visualY = previousSnake.visualY;
            this.direction = previousSnake.direction;
            return;
        }
        this.x = Math.floor(columns / 2);
        this.y = Math.floor(rows / 2);
        this.visualX = this.x;
        this.visualY = this.y;

        if (previousSnake) {
            this.direction = previousSnake.direction;
        } else {
            this.direction = 'right';
        }
    }
}
