// Define common interfaces and types used across the game

// Particle interface for the particle system
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    size: number;
}

// Position interface used for animations
export interface Position {
    x: number;
    y: number;
}

export interface SizeInfo {
    width: number;
    height: number;
    rows: number;
    columns: number;
}

// Direction type
export type Direction = 'up' | 'down' | 'left' | 'right';
