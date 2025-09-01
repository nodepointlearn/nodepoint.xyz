/**
 * Nodepoint Website - Main JavaScript
 * Handles language switching, mobile navigation, form submission, and animations
 */

// Sanitize HTML content to prevent XSS
const sanitizeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Language switching functionality
function setLanguage(lang) {
  // Validate language input
  const validLanguages = ['en', 'bn'];
  if (!validLanguages.includes(lang)) {
    console.error('Invalid language code');
    return;
  }
  
  try {
    // Save preference
    localStorage.setItem('preferredLanguage', lang);
    
    // Update HTML attributes
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update year in footer
    const year = new Date().getFullYear();
    const yearElements = document.querySelectorAll('[data-year]');
    yearElements.forEach(el => {
      if (el.textContent !== String(year)) {
        el.textContent = year;
      }
    });
    
    // Keep consistent LTR direction for both languages
    document.body.style.direction = 'ltr';
    document.body.style.textAlign = 'left';
    
    // Update all translatable elements
    document.querySelectorAll('[data-en], [data-bn]').forEach(el => {
      if (el.dataset[lang]) {
        const text = el.dataset[lang];
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else if (el.tagName === 'IMG') {
          el.alt = text;
        } else {
          el.textContent = text;
        }
      }
    });
  } catch (error) {
    console.error('Error setting language:', error);
  }
}

// Initialize language from localStorage or browser language
function initLanguage() {
  const savedLang = localStorage.getItem('preferredLanguage');
  const browserLang = navigator.language.startsWith('bn') ? 'bn' : 'en';
  setLanguage(savedLang || browserLang);
}

// Initialize the application
function initApp() {
  // DOM Elements
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav');
  const navLinks = document.querySelectorAll('.nav a');
  const langButtons = document.querySelectorAll('.lang-btn');
  const contactForm = document.getElementById('contact-form');
  
  // Initialize language
  initLanguage();
  
  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      navToggle.setAttribute('aria-expanded', isExpanded);
    });
  }
  
  // Close mobile menu when clicking on a nav link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu && navToggle && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        history.pushState(null, null, targetId);
      }
    });
  });
  
  // Language switcher
  langButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setLanguage(btn.dataset.lang);
    });
  });
  
  // Form submission with validation and CSRF protection
  if (contactForm) {
    // Add CSRF token to form
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    
    const validateForm = (formData) => {
      const errors = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!formData.get('name')?.trim()) {
        errors.push('Name is required');
      }
      
      if (!formData.get('email')?.trim()) {
        errors.push('Email is required');
      } else if (!emailRegex.test(formData.get('email'))) {
        errors.push('Please enter a valid email address');
      }
      
      if (!formData.get('message')?.trim()) {
        errors.push('Message is required');
      }
      
      return errors;
    };
    
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      const formData = new FormData(contactForm);
      
      // Clear previous errors
      document.querySelectorAll('.form-error').forEach(el => el.remove());
      
      // Validate form
      const errors = validateForm(formData);
      if (errors.length > 0) {
        errors.forEach(error => {
          const errorEl = document.createElement('div');
          errorEl.className = 'form-error text-red-500 text-sm mt-1';
          errorEl.textContent = error;
          contactForm.insertBefore(errorEl, contactForm.firstChild);
        });
        return;
      }
      
      try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        // Prepare request
        const response = await fetch(contactForm.action || '/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken })
          },
          body: JSON.stringify(Object.fromEntries(formData)),
          credentials: 'same-origin'
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const result = await response.json();
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'alert alert-success';
        successMsg.textContent = result.message || 'Thank you for your message! We will get back to you soon.';
        contactForm.prepend(successMsg);
        
        // Reset form
        contactForm.reset();
        
        // Remove success message after 5 seconds
        setTimeout(() => {
          successMsg.remove();
        }, 5000);
        
      } catch (error) {
        console.error('Form submission error:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'alert alert-error';
        errorMsg.textContent = 'There was an error sending your message. Please try again.';
        contactForm.prepend(errorMsg);
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Add current year to footer
  const yearElements = document.querySelectorAll('[data-year]');
  const currentYear = new Date().getFullYear();
  yearElements.forEach(el => {
    el.textContent = currentYear;
  });
  
  // Animate elements on scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.reveal');
    
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (elementTop < windowHeight - 100) {
        element.classList.add('visible');
      }
    });
  };
  
  // Run once on load
  animateOnScroll();
  
  // And on scroll
  window.addEventListener('scroll', animateOnScroll);
  
  // Close mobile menu when clicking outside
  window.addEventListener('click', (e) => {
    if (navMenu && navToggle && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      navMenu.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Cleanup function to remove event listeners
function cleanup() {
  // Remove all event listeners added to the document
  document.removeEventListener('click', handleDocumentClick);
  window.removeEventListener('scroll', handleScroll);
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    initApp();
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
  } catch (error) {
    console.error('Error initializing application:', error);
  }
});

// Error handling for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error || event.message, event);
  return false; // Prevent default error handling
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});
