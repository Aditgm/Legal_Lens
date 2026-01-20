class AuthManager {
  constructor() {
    this.loginTab = document.getElementById('loginTab');
    this.registerTab = document.getElementById('registerTab');
    this.loginForm = document.getElementById('loginForm');
    this.registerForm = document.getElementById('registerForm');
    this.authTabs = document.querySelector('.auth-tabs');
    this.toast = document.getElementById('authToast');
    
    this.init();
  }

  init() {
    this.setupTabSwitching();
    this.setupPasswordToggle();
    this.setupPasswordStrength();
    this.setupFormSubmissions();
    this.setupSocialAuth();
    this.setupAnimations();
  }

  // Tab Switching with Animation
  setupTabSwitching() {
    const tabs = [this.loginTab, this.registerTab];
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.authTabs.dataset.active = targetTab;
        
        // Switch forms with animation
        if (targetTab === 'login') {
          this.registerForm.classList.remove('active');
          setTimeout(() => {
            this.loginForm.classList.add('active');
          }, 100);
        } else {
          this.loginForm.classList.remove('active');
          setTimeout(() => {
            this.registerForm.classList.add('active');
          }, 100);
        }

        tab.style.transform = 'scale(0.95)';
        setTimeout(() => {
          tab.style.transform = 'scale(1)';
        }, 100);
      });
    });
  }

  // Password Visibility Toggle
  setupPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('.eye-icon');
        
        // Toggle type
        if (input.type === 'password') {
          input.type = 'text';
          icon.style.opacity = '1';
        } else {
          input.type = 'password';
          icon.style.opacity = '0.6';
        }
        
        // Micro-interaction: Bounce effect
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 200);
      });
    });
  }

  // Password Strength Indicator
  setupPasswordStrength() {
    const registerPassword = document.getElementById('registerPassword');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!registerPassword) return;
    
    registerPassword.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = this.calculatePasswordStrength(password);
      strengthFill.className = 'strength-fill';
      
      if (password.length === 0) {
        strengthFill.style.width = '0';
        strengthText.textContent = 'Password strength';
        strengthText.style.color = '#64748b';
      } else if (strength < 40) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#ef4444';
      } else if (strength < 70) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = '#f59e0b';
      } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
      }
    });
  }

  calculatePasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    
    return strength;
  }

  // Form Submissions
  setupFormSubmissions() {
    // Login Form
    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const remember = document.getElementById('rememberMe').checked;
      
      // Show loading state
      const submitBtn = this.loginForm.querySelector('.btn-submit');
      this.setButtonLoading(submitBtn, true);
      
      try {
        // Simulate API call
        await this.simulateAPICall();
        
        // Store user session
        const userData = {
          email,
          name: email.split('@')[0],
          loggedIn: true,
          timestamp: Date.now()
        };
        
        if (remember) {
          localStorage.setItem('legalLensUser', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('legalLensUser', JSON.stringify(userData));
        }
        
        this.showToast('Sign in successful! Redirecting...');
        
        // Redirect to chat page
        setTimeout(() => {
          window.location.href = 'chat.html';
        }, 1500);
        
      } catch (error) {
        this.showToast('Sign in failed. Please try again.', 'error');
        this.setButtonLoading(submitBtn, false);
      }
    });
    
    // Register Form
    this.registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const agreeTerms = document.getElementById('agreeTerms').checked;
      
      // Validation
      if (password !== confirmPassword) {
        this.showToast('Passwords do not match!', 'error');
        this.shakeElement(document.getElementById('confirmPassword'));
        return;
      }
      
      if (!agreeTerms) {
        this.showToast('Please agree to Terms of Service', 'error');
        return;
      }
      
      // Show loading state
      const submitBtn = this.registerForm.querySelector('.btn-submit');
      this.setButtonLoading(submitBtn, true);
      
      try {
        await this.simulateAPICall();
        
        // Store user data
        const userData = {
          name,
          email,
          loggedIn: true,
          timestamp: Date.now()
        };
        
        localStorage.setItem('legalLensUser', JSON.stringify(userData));
        
        this.showToast('Account created successfully! Redirecting...');
        
        // Redirect to chat page
        setTimeout(() => {
          window.location.href = 'chat.html';
        }, 1500);
        
      } catch (error) {
        this.showToast('Registration failed. Please try again.', 'error');
        this.setButtonLoading(submitBtn, false);
      }
    });
  }

  // Social Authentication
  setupSocialAuth() {
    const socialBtns = document.querySelectorAll('.social-btn');
    
    socialBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.classList.contains('google') ? 'Google' : 'Microsoft';
        
        // Micro-interaction: Scale animation
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 200);
        
        this.showToast(`${provider} authentication coming soon!`, 'info');
      });
    });
  }

  // Setup Input Animations
  setupAnimations() {
    const inputs = document.querySelectorAll('input');
    
    inputs.forEach(input => {
      // Focus animation
      input.addEventListener('focus', () => {
        input.parentElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        input.parentElement.style.transform = 'translateY(-2px)';
      });
      
      input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'translateY(0)';
      });
    });
  }

  // Button Loading State
  setButtonLoading(button, loading) {
    if (loading) {
      button.disabled = true;
      button.innerHTML = `
        <svg class="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
          <path d="M10 2C5.58172 2 2 5.58172 2 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Processing...</span>
      `;
      button.style.opacity = '0.8';
    } else {
      button.disabled = false;
      button.style.opacity = '1';
    }
  }

  // Toast Notification
  showToast(message, type = 'success') {
    const toastMessage = this.toast.querySelector('.toast-message');
    const toastIcon = this.toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    
    // Update icon based on type
    if (type === 'error') {
      toastIcon.innerHTML = `
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      `;
      toastIcon.style.color = '#ef4444';
    } else {
      toastIcon.innerHTML = `
        <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M6 10L9 13L14 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      `;
      toastIcon.style.color = '#10b981';
    }
    
    this.toast.classList.add('show');
    
    setTimeout(() => {
      this.toast.classList.remove('show');
    }, 3000);
  }

  shakeElement(element) {
    element.style.animation = 'shake 0.5s';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);
  }

  simulateAPICall() {
    return new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});
