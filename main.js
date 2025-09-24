(() => {
  const canvas = document.getElementById('scene');
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const simulationState = {
    canvasCssWidth: 0,
    canvasCssHeight: 0,
    devicePixelRatio: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
    balls: [],
    lastFrameTimeMs: 0,
    isRunning: true
  };

  function resizeCanvasToDisplaySize() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    simulationState.canvasCssWidth = cssWidth;
    simulationState.canvasCssHeight = cssHeight;
    simulationState.devicePixelRatio = dpr;

    const displayWidth = Math.floor(cssWidth * dpr);
    const displayHeight = Math.floor(cssHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Ensure drawing units are in CSS pixels while rendering at device resolution
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = getRandomInRange(65, 85);
    const lightness = getRandomInRange(50, 65);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  class Ball {
    constructor(x, y, radius, velocityX, velocityY, color) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.velocityX = velocityX;
      this.velocityY = velocityY;
      this.color = color;
    }

    update(deltaSeconds, boundsWidth, boundsHeight) {
      // Integrate position
      this.x += this.velocityX * deltaSeconds;
      this.y += this.velocityY * deltaSeconds;

      // Handle wall collisions with simple elastic reflection
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.velocityX = Math.abs(this.velocityX);
      } else if (this.x + this.radius > boundsWidth) {
        this.x = boundsWidth - this.radius;
        this.velocityX = -Math.abs(this.velocityX);
      }

      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.velocityY = Math.abs(this.velocityY);
      } else if (this.y + this.radius > boundsHeight) {
        this.y = boundsHeight - this.radius;
        this.velocityY = -Math.abs(this.velocityY);
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Subtle glossy highlight for depth
      const gradient = ctx.createRadialGradient(
        this.x - this.radius * 0.35,
        this.y - this.radius * 0.35,
        this.radius * 0.05,
        this.x,
        this.y,
        this.radius
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  function initializeBalls(count) {
    const balls = [];
    const width = simulationState.canvasCssWidth;
    const height = simulationState.canvasCssHeight;

    for (let index = 0; index < count; index += 1) {
      const radius = getRandomInRange(10, 28);
      const x = getRandomInRange(radius, Math.max(radius + 1, width - radius));
      const y = getRandomInRange(radius, Math.max(radius + 1, height - radius));
      const speed = getRandomInRange(60, 220); // pixels per second
      const direction = Math.random() * Math.PI * 2;
      const velocityX = Math.cos(direction) * speed;
      const velocityY = Math.sin(direction) * speed;
      const color = getRandomColor();
      balls.push(new Ball(x, y, radius, velocityX, velocityY, color));
    }

    simulationState.balls = balls;
  }

  function step(timestampMs) {
    if (!simulationState.isRunning) return;

    if (!simulationState.lastFrameTimeMs) {
      simulationState.lastFrameTimeMs = timestampMs;
    }
    const deltaSeconds = Math.min(0.033, Math.max(0.001, (timestampMs - simulationState.lastFrameTimeMs) / 1000));
    simulationState.lastFrameTimeMs = timestampMs;

    // Clear background
    context.clearRect(0, 0, simulationState.canvasCssWidth, simulationState.canvasCssHeight);

    // Update and draw
    for (let i = 0; i < simulationState.balls.length; i += 1) {
      const ball = simulationState.balls[i];
      ball.update(deltaSeconds, simulationState.canvasCssWidth, simulationState.canvasCssHeight);
      ball.draw(context);
    }

    requestAnimationFrame(step);
  }

  function handleResize() {
    const previousWidth = simulationState.canvasCssWidth;
    const previousHeight = simulationState.canvasCssHeight;
    resizeCanvasToDisplaySize();

    const newWidth = simulationState.canvasCssWidth;
    const newHeight = simulationState.canvasCssHeight;

    if (previousWidth !== 0 && previousHeight !== 0 && (newWidth !== previousWidth || newHeight !== previousHeight)) {
      const scaleX = newWidth / previousWidth;
      const scaleY = newHeight / previousHeight;
      // Reposition balls proportionally to keep layout consistent after resize
      for (let i = 0; i < simulationState.balls.length; i += 1) {
        const ball = simulationState.balls[i];
        ball.x *= scaleX;
        ball.y *= scaleY;
        // Clamp to new bounds
        ball.x = Math.min(Math.max(ball.radius, ball.x), Math.max(ball.radius, newWidth - ball.radius));
        ball.y = Math.min(Math.max(ball.radius, ball.y), Math.max(ball.radius, newHeight - ball.radius));
      }
    }
  }

  // Accessibility: honor reduced motion preference
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateMotionPreference() {
    simulationState.isRunning = !mediaQuery.matches;
    if (simulationState.isRunning) {
      simulationState.lastFrameTimeMs = 0;
      requestAnimationFrame(step);
    }
  }
  mediaQuery.addEventListener('change', updateMotionPreference);

  // Initialize
  resizeCanvasToDisplaySize();
  initializeBalls(32);
  window.addEventListener('resize', handleResize);

  updateMotionPreference();
  if (simulationState.isRunning) {
    requestAnimationFrame(step);
  }

  // Optional: click to add more balls
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = getRandomInRange(10, 28);
    const speed = getRandomInRange(80, 240);
    const direction = Math.random() * Math.PI * 2;
    const velocityX = Math.cos(direction) * speed;
    const velocityY = Math.sin(direction) * speed;
    simulationState.balls.push(new Ball(x, y, radius, velocityX, velocityY, getRandomColor()));
  });
})();

