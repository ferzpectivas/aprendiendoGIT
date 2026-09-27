const animacion = (p) => {
  let particles = [];
  let largeParticles = [];

  p.setup = function () {
    let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('animacion-fondo');

    for (let i = 0; i < 18; i++) {
      largeParticles.push(new LargeParticle(p));
    }
    for (let i = 0; i < 90; i++) {
      particles.push(new SmallParticle(p));
    }
  };

  p.draw = function () {
    p.background(255, 255, 255);
    drawConnections();

    for (let lp of largeParticles) {
      lp.update();
      lp.display();
    }
    for (let sp of particles) {
      sp.update();
      sp.display();
    }
  };

  function drawConnections() {
    let maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let d = p.dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
        if (d < maxDist) {
          let alpha = p.map(d, 0, maxDist, 50, 0);
          p.stroke(30, 41, 59, alpha);
          p.strokeWeight(0.5);
          p.line(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
        }
      }
    }
    for (let lp of largeParticles) {
      for (let sp of particles) {
        let d = p.dist(lp.x, lp.y, sp.x, sp.y);
        if (d < maxDist * 1.5) {
          let alpha = p.map(d, 0, maxDist * 1.5, 35, 0);
          p.stroke(30, 41, 59, alpha);
          p.strokeWeight(0.3);
          p.line(lp.x, lp.y, sp.x, sp.y);
        }
      }
    }
  }

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  class LargeParticle {
    constructor(p) {
      this.p = p;
      this.x = p.random(p.width);
      this.y = p.random(p.height);
      this.vx = p.random(-0.8, 0.8);
      this.vy = p.random(-0.8, 0.8);
      this.size = p.random(20, 40);
      this.baseAlpha = p.random(40, 100);
      this.pulseSpeed = p.random(0.02, 0.05);
      this.pulseOffset = p.random(p.TWO_PI);
      this.color = [30, 41, 59];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > this.p.width) this.vx *= -1;
      if (this.y < 0 || this.y > this.p.height) this.vy *= -1;
      this.x = this.p.constrain(this.x, 0, this.p.width);
      this.y = this.p.constrain(this.y, 0, this.p.height);
    }

    display() {
      let pulse = this.p.sin(this.p.frameCount * this.pulseSpeed + this.pulseOffset) * 0.3 + 0.7;
      let alpha = this.baseAlpha * pulse;
      for (let i = 3; i > 0; i--) {
        let glowSize = this.size + i * 8;
        let glowAlpha = alpha * 0.08;
        this.p.noStroke();
        this.p.fill(this.color[0], this.color[1], this.color[2], glowAlpha);
        this.p.ellipse(this.x, this.y, glowSize);
      }
      this.p.fill(this.color[0], this.color[1], this.color[2], alpha);
      this.p.ellipse(this.x, this.y, this.size);
      this.p.fill(this.color[0], this.color[1], this.color[2], alpha * 1.2);
      this.p.ellipse(this.x, this.y, this.size * 0.4);
    }
  }

  class SmallParticle {
    constructor(p) {
      this.p = p;
      this.x = p.random(p.width);
      this.y = p.random(p.height);
      this.vx = p.random(-1.5, 1.5);
      this.vy = p.random(-1.5, 1.5);
      this.size = p.random(2, 5);
      this.alpha = p.random(80, 180);
      this.color = [30, 41, 59];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > this.p.width) this.vx *= -1;
      if (this.y < 0 || this.y > this.p.height) this.vy *= -1;
      this.x = this.p.constrain(this.x, 0, this.p.width);
      this.y = this.p.constrain(this.y, 0, this.p.height);
    }

    display() {
      this.p.noStroke();
      this.p.fill(this.color[0], this.color[1], this.color[2], this.alpha);
      this.p.ellipse(this.x, this.y, this.size);
    }
  }
};

new p5(animacion);