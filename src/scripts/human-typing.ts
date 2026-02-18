// Human-like typing effect with variable speed
// Simulates natural typing: faster on familiar words, slower on complex ones

interface HumanTypingOptions {
  cursor?: string;
  baseSpeed?: number;
  variation?: number;
  pauseChars?: string[];
  pauseDuration?: number;
  onComplete?: () => void;
}

class HumanTyping {
  private element: HTMLElement;
  private text: string;
  private cursor: string;
  private baseSpeed: number;
  private variation: number;
  private pauseChars: string[];
  private pauseDuration: number;
  private onComplete: () => void;

  constructor(element: HTMLElement, text: string, options: HumanTypingOptions = {}) {
    this.element = element;
    this.text = text;
    this.cursor = options.cursor || '▊';
    this.baseSpeed = options.baseSpeed || 50;
    this.variation = options.variation || 0.3; // 30% speed variation
    this.pauseChars = options.pauseChars || ['.', ',', '!', '?', ';', ':'];
    this.pauseDuration = options.pauseDuration || 150;
    this.onComplete = options.onComplete || (() => {});
  }

  type(): void {
    let index = 0;
    this.element.innerHTML = this.cursor;

    const typeChar = (): void => {
      if (index < this.text.length) {
        const char = this.text[index];

        // Add character with cursor
        this.element.innerHTML = this.text.substring(0, index + 1) + this.cursor;

        // Calculate random typing speed
        const speed = this.calculateSpeed(char);

        index++;
        setTimeout(typeChar, speed);
      } else {
        // Typing complete - remove cursor after a moment
        setTimeout(() => {
          this.element.innerHTML = this.text;
          this.onComplete();
        }, 500);
      }
    };

    setTimeout(typeChar, this.baseSpeed);
  }

  private calculateSpeed(char: string): number {
    // Base speed with random variation
    const randomVariation = this.baseSpeed * this.variation * (Math.random() - 0.5);
    let speed = this.baseSpeed + randomVariation;

    // Longer pause on punctuation
    if (this.pauseChars.includes(char)) {
      speed += this.pauseDuration;
    }

    // Faster on spaces (like real typing)
    if (char === ' ') {
      speed *= 0.7;
    }

    // Slower on uppercase (shift key)
    if (char === char.toUpperCase() && char !== ' ') {
      speed += 30;
    }

    return Math.max(speed, 20); // Minimum 20ms
  }
}

// Easter Egg Command Listener
// Listen for terminal-like commands in console
const easterEggs: Record<string, () => void> = {
  'sudo rm -rf /': () => {
    console.log('%c⚠️  SYSTEM PROTECTION ACTIVE', 'color: #ff6b6b; font-size: 20px; font-weight: bold;');
    console.log('%cNice try! nanobytes is safe and sound 🛡️', 'color: #4ec9b0; font-size: 14px;');
    showTerminalMessage('sudo rm -rf /', 'Permission denied: nanobytes protected!');
  },
  'sudo su': () => {
    console.log('%c🚫 Root access denied', 'color: #ff6b6b; font-size: 16px; font-weight: bold;');
    showTerminalMessage('sudo su', 'Nice try! No root for you 😈');
  },
  'whoami': () => {
    console.log('%cnanobytes_visitor', 'color: #4ec9b0; font-size: 14px;');
    showTerminalMessage('whoami', 'nanobytes_visitor');
  },
  'date': () => {
    const now = new Date().toString();
    console.log('%c' + now, 'color: #ce9178; font-size: 12px;');
    showTerminalMessage('date', now);
  },
  'neofetch': () => {
    const ascii = `
   _____
  /     \\
 |  O O  |
 |   ^   |
 |  '_'  |
  \\_____/
`;
    console.log('%c' + ascii, 'font-family: monospace; color: #4ec9b0;');
    console.log('%cnanobytes OS v1.0', 'color: #569cd6; font-size: 12px;');
    showTerminalMessage('neofetch', 'Check browser console for ASCII art! 🎨');
  },
  'clear': () => {
    showTerminalMessage('clear', 'Terminal cleared (not really, but pretend!)');
  },
  'help': () => {
    const commands = Object.keys(easterEggs).join(', ');
    console.log('%cAvailable commands:', 'color: #4ec9b0; font-weight: bold;');
    console.log('%c' + commands, 'color: #ce9178;');
    showTerminalMessage('help', `Try: ${commands}`);
  }
};

// Show terminal message in UI
function showTerminalMessage(command: string, message: string): void {
  const terminal = document.createElement('div');
  terminal.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Courier New', monospace;
    padding: 1rem;
    border: 1px solid #4ec9b0;
    border-radius: 4px;
    z-index: 9998;
    max-width: 400px;
    animation: terminalSlide 0.3s ease-out;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `;

  terminal.innerHTML = `
    <div style="color: #6a9955;">$ ${command}</div>
    <div style="margin-top: 0.5rem; color: #ce9178;">${message}</div>
  `;

  document.body.appendChild(terminal);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    terminal.style.animation = 'terminalFadeOut 0.3s ease-out forwards';
    setTimeout(() => {
      if (document.body.contains(terminal)) {
        document.body.removeChild(terminal);
      }
    }, 300);
  }, 5000);
}

// Listen for keyboard input (Ctrl+Shift+C to open command input)
let commandMode = false;
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    commandMode = true;
    const command = prompt('$ Enter terminal command:');
    if (command && easterEggs[command]) {
      easterEggs[command]();
    } else if (command) {
      console.log('%cCommand not found. Type "help" for options.', 'color: #ff6b6b;');
      showTerminalMessage(command, 'Command not found. Type "help" for options.');
    }
  }
});

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes terminalSlide {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes terminalFadeOut {
    to {
      opacity: 0;
      transform: translateY(10px);
    }
  }
`;
document.head.appendChild(style);

// Export for use in components
(window as any).HumanTyping = HumanTyping;

export { HumanTyping, easterEggs, showTerminalMessage };
