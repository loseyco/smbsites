// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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
});

// Copy email to clipboard function (global for onclick handler)
function copyEmailToClipboard(email) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(() => {
            // Show feedback
            const btn = document.querySelector('.contact-copy-btn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy email:', err);
            fallbackCopyEmail(email);
        });
    } else {
        fallbackCopyEmail(email);
    }
}

// Fallback copy method for older browsers
function fallbackCopyEmail(email) {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            const btn = document.querySelector('.contact-copy-btn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        } else {
            alert('Please copy manually: ' + email);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Please copy manually: ' + email);
    }
    
    document.body.removeChild(textarea);
}
