// Konami Code Easter Egg
// Up, Up, Down, Down, Left, Right, Left, Right, B, A

const konamiSequence = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA'
];

let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.code === konamiSequence[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiSequence.length) {
      triggerEasterEgg();
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

function triggerEasterEgg() {
  // Create a fun terminal popup
  const terminal = document.createElement('div');
  terminal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1e1e1e;
    color: #4ec9b0;
    font-family: 'Courier New', monospace;
    padding: 2rem;
    border: 2px solid #569cd6;
    border-radius: 8px;
    z-index: 9999;
    box-shadow: 0 0 20px rgba(78, 201, 176, 0.5);
    animation: konamiPop 0.3s ease-out;
  `;

  terminal.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 1rem;">🎮 KONAMI CODE ACTIVATED!</div>
    <div style="color: #6a9955;">$ You found the secret terminal...</div>
    <div style="margin: 1rem 0; color: #ce9178;">
      > ACCESS GRANTED<br>
      > nanobytes level: <span style="color: #4ec9b0;">MAX</span><br>
      > 🎉 +1000 XP
    </div>
    <div style="font-size: 0.9rem; color: #808080;">[Press any key to close]</div>
  `;

  document.body.appendChild(terminal);

  // Close on any key press
  const closeHandler = () => {
    document.body.removeChild(terminal);
    document.removeEventListener('keydown', closeHandler);
  };
  document.addEventListener('keydown', closeHandler);

  // Also close after 5 seconds
  setTimeout(() => {
    if (document.body.contains(terminal)) {
      document.body.removeChild(terminal);
      document.removeEventListener('keydown', closeHandler);
    }
  }, 5000);
}

// Add keyframe animation
const style = document.createElement('style');
style.textContent = `
  @keyframes konamiPop {
    from {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
