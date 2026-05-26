//LANDING PAGE - JavaScript
  

// HAMBURGER MENU FUNCTIONALITY 
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        hamburger.classList.toggle('active');
    });

    // Close menu when any link is clicked
    document.querySelectorAll('.nav-links a, .nav-brand').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.style.display = 'none';
            hamburger.classList.remove('active');
        });
    });
}

// SCROLL ANIMATIONS 
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.feature-card, .step-card, .stat-card, .benefit-item, .role-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// COUNTER ANIMATION FOR STATISTICS 
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
            entry.target.dataset.counted = 'true';
            animateCounter(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(counter => {
    counterObserver.observe(counter);
});

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000; // 2 seconds
    const start = 0;
    const increment = target / (duration / 16); // 60fps

    let current = start;

    const counter = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// SMOOTH SCROLL FOR NAVIGATION 
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// NAVBAR SCROLL EFFECT 
const navbar = document.querySelector('.navbar');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Add scrolled class for enhanced styling
    if (scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Update active navigation link based on scroll position
    updateActiveNavLink();

    // Hide navbar on scroll down, show on scroll up
    if (scrollY > lastScrollY && scrollY > 500) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }

    lastScrollY = scrollY;
});

// Smooth transition for navbar
navbar.style.transition = 'transform 0.3s ease-in-out, background 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border-bottom-color 0.3s ease-in-out';

// ACTIVE NAVIGATION LINK HIGHLIGHTING 
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id], footer[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const navBrand = document.querySelector('.nav-brand');
    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    // Update regular nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });

    // Highlight brand when on hero section
    if (navBrand) {
        if (currentSection === 'hero') {
            navBrand.style.opacity = '0.7';
        } else {
            navBrand.style.opacity = '1';
        }
    }
}

// FLOATING ELEMENTS PARALLAX 
const floatingCards = document.querySelectorAll('.floating-card');

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    // Only apply parallax if user hasn't scrolled past hero
    if (scrollY < windowHeight) {
        floatingCards.forEach((card, index) => {
            const speed = 0.5 + (index * 0.1);
            card.style.transform = `translateY(${scrollY * speed}px)`;
        });
    }
});

// MOUSE HOVER EFFECTS ON CARDS 
document.querySelectorAll('.feature-card, .role-card, .benefit-item').forEach(card => {
    card.addEventListener('mouseenter', (e) => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', (e) => {
        card.style.transform = 'translateY(0)';
    });
});

// BUTTON RIPPLE EFFECT 
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'scale(1)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// LAZY LOADING IMAGES (if added in future) 
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ACTIVE LINK HIGHLIGHTING IN NAVIGATION 
function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveLink);

// Add active link styles
const activeStyle = document.createElement('style');
activeStyle.textContent = `
    .nav-links a.active {
        color: #1e3a8a;
        font-weight: 700;
    }

    .nav-links a.active::after {
        width: 100%;
    }
`;
document.head.appendChild(activeStyle);

// PERFORMANCE OPTIMIZATIONS 
// Throttle scroll events for better performance
let scrollTimeout;
const throttledScroll = () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(() => {
        // Animation frame operations already handle scroll efficiently
    });
};

window.addEventListener('scroll', throttledScroll, { passive: true });

// PAGE LOAD ANIMATION 
document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay for a more polished feel
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
    }, 100);
});

// MOBILE MENU AUTO-CLOSE ON RESIZE 
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        navLinks.style.display = 'flex';
        hamburger.classList.remove('active');
    } else {
        navLinks.style.display = 'none';
    }
});

// KEYBOARD NAVIGATION 
document.addEventListener('keydown', (e) => {
    // Escape key closes mobile menu
    if (e.key === 'Escape' && navLinks.style.display === 'flex' && window.innerWidth <= 768) {
        navLinks.style.display = 'none';
        hamburger.classList.remove('active');
    }
});

// FORM VALIDATION (if forms added in future) 
function validateForm(form) {
    const inputs = form.querySelectorAll('input, textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

// ACCESSIBILITY IMPROVEMENTS 
// Focus visible styles
const focusStyle = document.createElement('style');
focusStyle.textContent = `
    .btn:focus-visible,
    a:focus-visible {
        outline: 2px solid #1e3a8a;
        outline-offset: 2px;
    }

    .nav-links a:focus-visible::after {
        width: 100%;
    }
`;
document.head.appendChild(focusStyle);

// PRINT STYLES 
const printStyle = document.createElement('style');
printStyle.media = 'print';
printStyle.textContent = `
    .navbar,
    .hamburger {
        display: none;
    }

    .hero,
    .features,
    .statistics {
        page-break-inside: avoid;
    }
`;
document.head.appendChild(printStyle);

console.log('Landing page loaded successfully with smooth animations and interactions!');
