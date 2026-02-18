/**
 * Typing Effect for Terminal-Style Text
 * Creates a typewriter animation for terminal commands
 */

class TypingEffect {
  constructor(element, options = {}) {
    this.element = element;
    this.text = element.textContent;
    this.speed = options.speed || 50; // ms per character
    this.cursorChar = options.cursorChar || '█';
    this.showCursor = options.showCursor !== false;
    this.cursorElement = null;
    this.currentIndex = 0;
    this.isTyping = false;
    this.isComplete = false;
  }

  start() {
    if (this.isTyping || this.isComplete) return;
    this.isTyping = true;

    // Clear element
    this.element.textContent = '';

    // Create cursor element
    if (this.showCursor) {
      this.cursorElement = document.createElement('span');
      this.cursorElement.className = 'typing-cursor';
      this.cursorElement.textContent = this.cursorChar;
      this.cursorElement.style.color = 'var(--tmux-accent-secondary)';
      this.cursorElement.style.animation = 'blink 1s infinite';
      this.element.appendChild(this.cursorElement);
    }

    // Type characters
    this.typeNext();
  }

  typeNext() {
    if (this.currentIndex < this.text.length) {
      // Insert character before cursor
      const char = document.createTextNode(this.text[this.currentIndex]);
      this.element.insertBefore(char, this.cursorElement);
      this.currentIndex++;

      // Schedule next character
      setTimeout(() => this.typeNext(), this.speed);
    } else {
      this.isTyping = false;
      this.isComplete = true;
    }
  }

  reset() {
    this.isTyping = false;
    this.isComplete = false;
    this.currentIndex = 0;
    this.element.textContent = this.text;
  }
}

// Auto-initialize typing effects on elements with data-typing attribute
document.addEventListener('DOMContentLoaded', () => {
  const typingElements = document.querySelectorAll('[data-typing]');
  typingElements.forEach(element => {
    const speed = parseInt(element.dataset.typingSpeed) || 50;
    const typing = new TypingEffect(element, { speed });
    typing.start();
  });
});

export default TypingEffect;
