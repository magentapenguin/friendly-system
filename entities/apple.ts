import { ctx, size, columns, rows } from '../config';

export class Apple {
    x: number;
    y: number;
    scale: number = 1;
    scaleDirection: number = -1;
    eaten: boolean = false;
    eatenProgress: number = 0;

    draw() {
        // Pulse animation
        this.scale += this.scaleDirection * 0.01;
        if (this.scale <= 0.8) {
            this.scale = 0.8;
            this.scaleDirection = 1;
        } else if (this.scale >= 1) {
            this.scale = 1;
            this.scaleDirection = -1;
        }

        const adjustedSize = size * this.scale;
        const offset = (size - adjustedSize) / 2;

        if (this.eaten) {
            // Shrink and fade out animation when eaten
            this.eatenProgress += 0.1;
            const eatScale = 1 - this.eatenProgress;
            if (this.eatenProgress >= 1) return;

            ctx.globalAlpha = 1 - this.eatenProgress;
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.roundRect(
                this.x * size + offset + size/2 * this.eatenProgress,
                this.y * size + offset + size/2 * this.eatenProgress,
                adjustedSize * eatScale,
                adjustedSize * eatScale,
                5 * eatScale
            );
            ctx.fill();
            ctx.closePath();
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.roundRect(this.x * size + offset, this.y * size + offset, adjustedSize, adjustedSize, 5);
            ctx.fill();
            ctx.closePath();

            // Add a shine effect
            const time = Date.now() / 1000;
            const shine = Math.max(0, Math.sin(time * 2) * 0.5);

            ctx.fillStyle = `rgba(255, 255, 255, ${shine})`;
            ctx.beginPath();
            ctx.arc(
                this.x * size + size * 0.7,
                this.y * size + size * 0.3,
                size * 0.2,
                0, Math.PI * 2
            );
            ctx.fill();

            // Add a shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.roundRect(
                this.x * size + 3,
                this.y * size + 3,
                adjustedSize,
                adjustedSize,
                5
            );
            ctx.fill();
        }
    }

    inspect() {
        return {
            x: this.x,
            y: this.y
        }
    }

    constructor() {
        this.x = Math.floor(Math.random() * columns);
        this.y = Math.floor(Math.random() * rows);
    }
}