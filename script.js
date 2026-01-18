// Initialize Lenis
const lenis = new Lenis({
  // Optional configuration object
  lerp: 0.1, // Lower values for smoother, slower scrolling
  wheelMultiplier: 1, // Adjust the scroll speed
  smooth: false, // Enables smooth scrolling (default is true)
});

// Optional: Log scroll events to the console
lenis.on("scroll", (e) => {
  console.log(e);
});

// Function to call on each animation frame
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

// Start the animation frame loop
requestAnimationFrame(raf);

const cursorElement = document.querySelector(".cursor");

const mouse = { x: 0, y: 0 };
const previousMouse = { x: 0, y: 0 };
const circle = { x: 0, y: 0 };
let currentScale = 0;
let currentAngle = 0;

document.addEventListener("mousemove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

const speed = 0.17;

const tick = () => {
  circle.x += (mouse.x - circle.x) * speed;
  circle.y += (mouse.y - circle.y) * speed;

  const translateTransform = `translate(${circle.x}px, ${circle.y}px)`;

  //Squeeze
  const deltaMouseX = mouse.x - previousMouse.x;
  const deltaMouseY = mouse.y - previousMouse.y;
  previousMouse.x = mouse.x;
  previousMouse.y = mouse.y;

  const mouseVelocity = Math.min(
    Math.sqrt(deltaMouseX ** 2 + deltaMouseY ** 2) * 4,
    150
  );
  const scaleValue = (mouseVelocity / 150) * 0.5;

  currentScale += (scaleValue - currentScale) * speed;

  const scaleTransform = `scale(${1 + currentScale}, ${1 - currentScale})`;

  // Rotate With Trig
  const angle =
    mouseVelocity > 20
      ? (Math.atan2(deltaMouseY, deltaMouseX) * 180) / Math.PI
      : currentAngle;

  if (mouseVelocity > 20) {
    currentAngle = angle;
  }

  const rotateTransform = `rotate(${angle}deg)`;

  //Actually Applyy all the transformations
  cursorElement.style.transform = `${translateTransform} ${rotateTransform} ${scaleTransform}`;

  window.requestAnimationFrame(tick);
};

tick();

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".trail-container");

  const config = {
    imageCount: 23,
    imageLifespan: 750,
    removalDelay: 50,
    mouseThreshold: 100,
    scrollThreshold: 50,
    idleCursorInterval: 1000,
    inDuration: 750,
    outDuration: 1000,
    inEasing: "cubic-bezier(.07,.5,.5,1)",
    outEasing: "cubic-bezier(.87,0,.13,1)",
  };

  const images = Array.from(
    { length: config.imageCount },
    (_, i) => `images/imageTrail/img${i + 1}.webp`
  );

  const trail = [];

  let mouseX = 0,
    mouseY = 0,
    lastMouseX = 0,
    lastMouseY = 0;
  let isMoving = false,
    isCursorInContainer = false;
  let lastRemovalTime = 0,
    lastSteadyImageTime = 0,
    lastScrollTime = 0;
  let isScrolling = false,
    scrollTicking = false;

  const isInContainer = (x, y) => {
    const rect = container.getBoundingClientRect();
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  };

  const setInitialMousePos = (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    isCursorInContainer = isInContainer(mouseX, mouseY);
    document.removeEventListener("mouseover", setInitialMousePos, false);
  };

  document.addEventListener("mouseover", setInitialMousePos, false);

  const hasMovedEnough = () => {
    const distance = Math.sqrt(
      Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2)
    );
    return distance > config.mouseThreshold;
  };

  const createTrailImage = () => {
    if (!isCursorInContainer) return;

    const now = Date.now();

    if (isMoving && hasMovedEnough()) {
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      createImage();
      return;
    }

    if (!isMoving && now - lastSteadyImageTime >= config.idleCursorInterval) {
      lastSteadyImageTime = now;
      createImage();
    }
  };

  const createImage = () => {
    const img = document.createElement("img");
    img.classList.add("trail-img");

    const randomIndex = Math.floor(Math.random() * images.length);
    const rotation = (Math.random() - 0.5) * 50;
    img.src = images[randomIndex];

    const rect = container.getBoundingClientRect();
    const relativeX = mouseX - rect.left;
    const relativeY = mouseY - rect.top;

    img.style.left = `${relativeX}px`;
    img.style.top = `${relativeY}px`;
    img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(0)`;
    img.style.transition = `transform ${config.inDuration}ms ${config.inEasing}`;
    img.style.width = `8.5vw`;
    img.style.height = `8.5vw`;

    container.appendChild(img);

    setTimeout(() => {
      img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(1)`;
    }, 10);

    trail.push({
      element: img,
      rotate: rotation,
      removeTime: Date.now() + config.imageLifespan,
    });
  };

  const createScrollTrailImage = () => {
    if (!isCursorInContainer) return;

    lastMouseX += (config.mouseThreshold + 10) * (Math.random() > 0.5 ? 1 : -1);
    lastMouseY += (config.mouseThreshold + 10) * (Math.random() > 0.5 ? 1 : -1);

    createImage();

    lastMouseX = mouseX;
    lastMouseY = mouseY;
  };

  const removeOldImages = () => {
    const now = Date.now();

    if (now - lastRemovalTime < config.removalDelay || trail.length === 0)
      return;

    const oldestImage = trail[0];
    if (now >= oldestImage.removeTime) {
      const imgToRemove = trail.shift();

      imgToRemove.element.style.transition = `transform ${config.outDuration}
            ms ${config.outEasing}`;
      imgToRemove.element.style.transform = `translate(-50%, -50%) rotate($
            {imgToRemove.rotate}deg) scale(0)`;

      lastRemovalTime = now;

      setTimeout(() => {
        if (imgToRemove.element.parentNode) {
          imgToRemove.element.parentNode.removeChild(imgToRemove.element);
        }
      }, config.outDuration);
    }
  };

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    isCursorInContainer = isInContainer(mouseX, mouseY);

    if (isCursorInContainer) {
      isMoving = true;
      clearTimeout(window.moveTimeout);

      window.moveTimeout = setTimeout(() => {
        isMoving = false;
      }, 100);
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      isCursorInContainer = isInContainer(mouseX, mouseY);

      if (isCursorInContainer) {
        isMoving = true;
        lastMouseX += (Math.random() - 0.5) * 10;

        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
          isMoving = false;
        }, 100);
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "scroll",
    () => {
      const now = Date.now();

      isScrolling = true;

      if (now - lastScrollTime < config.scrollThreshold) return;

      lastScrollTime = now;

      if (!scrollTicking) {
        requestAnimationFrame(() => {
          if (isScrolling) {
            createScrollTrailImage();
            isScrolling = false;
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  const animate = () => {
    createTrailImage();
    removeOldImages();
    requestAnimationFrame(animate);
  };
  animate();
});

const videos = document.querySelectorAll(".scroll-video");

const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.play();
        observer.unobserve(entry.target); // trigger once per video
      }
    });
  },
  { threshold: 0.05 }
);

videos.forEach((video) => observer.observe(video));
