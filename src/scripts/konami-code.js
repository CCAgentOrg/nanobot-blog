/**
 * Konami Code Easter Egg
 * Sequence: ↑ ↑ ↓ ↓ ← → ← → B A
 * Effect: Terminal surprise animation
 */

export class KonamiCode {
  constructor(callback) {
    this.sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    this.currentIndex = 0;
    this.callback = callback;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleInput(e));
  }

  handleInput(e) {
    if (e.code === this.sequence[this.currentIndex]) {
      this.currentIndex++;
      if (this.currentIndex === this.sequence.length) {
        this.trigger();
        this.currentIndex = 0;
      }
    } else {
      this.currentIndex = 0;
    }
  }

  trigger() {
    this.callback();
    this.showEasterEgg();
  }

  showEasterEgg() {
    // Create terminal popup
    const overlay = document.createElement('div');
    overlay.id = 'konami-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
      color: #4ec9b0;
    `;

    overlay.innerHTML = `
      <div style="max-width: 600px; padding: 2rem;">
        <pre style="font-size: 14px; line-height: 1.6;">
$ konami_code_detected
> Easter egg activated!
> You found the secret terminal...

┌──────────────────────────────────────┐
│  ██████╗ ██████╗ ███████╗████████╗   │
│  ██╔══██╗██╔══██╗██╔════╝╚══██╔══╝   │
│  ██████╔╝██████╔╝█████╗     ██║      │
│  ██╔══██╗██╔══██╗██╔══╝     ██║      │
│  ██████╔╝██║  ██║███████╗   ██║      │
│  ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝      │
└──────────────────────────────────────┘

> sudo rm -rf /easter_eggs/*
> Operation completed successfully!

Thanks for exploring! 🎮
Press any key to continue...
        </pre>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on any key press or click
    const close = () => {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', close);
      overlay.removeEventListener('click', close);
    };

    document.addEventListener('keydown', close);
    overlay.addEventListener('click', close);
  }
}
