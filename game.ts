const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const size = 20;
const rows = Math.floor(canvas.height / size);
const columns = Math.floor(canvas.width / size);

canvas.width = columns * size;
canvas.height = rows * size;

function preDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

class Apple {
    x: number;
    y: number;
    draw() {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.roundRect(this.x * size, this.y * size, size, size,5);
        ctx.fill();
        ctx.closePath();
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

class Snake {
    x: number;
    y: number;
    direction: string;
    draw() {
        const index = snakeBody.indexOf(this);
        // Calculate size modifier based on distance from head
        const sizeModifier = Math.max(0.5, 1 - (index * 0.05)) - 0.1; // Decrease by 5% per segment, minimum 50% size
        const adjustedSize = size * sizeModifier;
        
        // Center the segment in its grid cell
        const offset = (size - adjustedSize) / 2;
        
        ctx.beginPath();
        ctx.fillStyle = `rgb(0, ${255 - (index * 10)}, 0)`;
        ctx.roundRect(
            this.x * size + offset, 
            this.y * size + offset, 
            adjustedSize, 
            adjustedSize, 
            5 * sizeModifier // Adjust corner radius too
        );
        ctx.fill();
        ctx.closePath();
        
        // if connected to another body part connect to it visually
        if (index === 0) {
            return;
        }
        
        const connectedBody = snakeBody[index - 1];
        const dist = Math.sqrt(Math.pow(this.x - connectedBody.x, 2) + Math.pow(this.y - connectedBody.y, 2));
        if (dist > size) {
            console.log('dist', dist);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(this.x * size + size / 2, this.y * size + size / 2);
        ctx.lineTo(connectedBody.x * size + size / 2, connectedBody.y * size + size / 2);
        ctx.strokeStyle = ctx.fillStyle;
        // Adjust line width based on segment size
        ctx.lineWidth = 20 * sizeModifier;
        ctx.stroke();
        ctx.closePath();
    }
    inspect() {
        return {
            x: this.x,
            y: this.y,
            direction: this.direction
        }
    }
    constructor() {
        this.x = Math.floor(columns / 2);
        this.y = Math.floor(rows / 2);
        try {
            this.direction = snakeBody[0].direction;
        } catch (e) {
            this.direction = 'right';
        }
    }
}

function inspect() {
    console.log(apples.map(apple => apple.inspect()));
    console.log(snakeBody.map(body => body.inspect()));
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'i') {
        inspect();
    }
});

const apples = [new Apple()];

const snake = new Snake();
const snakeBody = [snake];

function draw() {
    preDraw();
    for (const apple of apples) {
        apple.draw();
    }
    for (const body of snakeBody) {
        body.draw();
    }
    requestAnimationFrame(draw);
}
draw();
function move() {
    const head = snakeBody[0];
    const newHead = new Snake();
    newHead.x = head.x;
    newHead.y = head.y;
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
    snakeBody.push(newTail);
}
function checkCollision() {
    const head = snakeBody[0];
    if (head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows) {
        // move back to the other side
        if (head.x < 0) {
            head.x = columns - 1;
        } else if (head.x >= columns) {
            head.x = 0;
        }
        if (head.y < 0) {
            head.y = rows - 1;
        }
        else if (head.y >= rows) {
            head.y = 0;
        }
    }
    for (let i = 1; i < snakeBody.length; i++) {
        if (head.x === snakeBody[i].x && head.y === snakeBody[i].y) {
            return true;
        }
    }
    return false;
}
function checkApple() {
    const head = snakeBody[0];
    for (let i = 0; i < apples.length; i++) {
        if (head.x === apples[i].x && head.y === apples[i].y) {
            grow();
            apples.splice(i, 1);
            apples.push(new Apple());
        }
    }
}
function gameLoop() {
    move();
    if (checkCollision()) {
    
        return;
    }
    checkApple();
}
setInterval(gameLoop, 100);
document.addEventListener('keydown', (e) => {
    const head = snakeBody[0];
    switch (e.key) {
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
});