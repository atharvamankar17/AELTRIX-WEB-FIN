/* ============================================================
   AELTRIX — Main JavaScript
   GSAP-powered cinematic animations & interactions
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const isAboutPage = window.location.pathname.includes('about');

  // ─── GSAP fallback ────────────────────────────────────────
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  if (!hasGSAP) {
    document.querySelectorAll('.reveal-up').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    const heroTitle = document.getElementById('hero-title');
    const heroTagline = document.getElementById('hero-tagline');
    const heroSubContent = document.getElementById('hero-sub-content');
    if (heroTitle) { heroTitle.style.opacity = '1'; heroTitle.style.filter = 'none'; }
    if (heroTagline) { heroTagline.style.opacity = '1'; heroTagline.style.filter = 'none'; }
    if (heroSubContent) { heroSubContent.style.opacity = '1'; }
  }

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ─── Navbar scroll state ─────────────────────────────────
  const navbar = document.getElementById('navbar');

  if (!isAboutPage) {
    const handleNavScroll = () => {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }

  // ─── Mobile menu ──────────────────────────────────────────
  const menuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Demo Modal ───────────────────────────────────────────
  const modalOverlay = document.getElementById('demo-modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const demoForm = document.getElementById('demo-form');
  const modalSuccess = document.getElementById('modal-success');
  const modalDone = document.getElementById('modal-done');
  const modalTitle = document.getElementById('modal-title');

  function openModal(type) {
    if (!modalOverlay) return;

    // Set title based on type
    if (modalTitle) {
      if (type === 'sales') {
        modalTitle.textContent = 'Talk to Sales';
      } else {
        modalTitle.textContent = 'Schedule a Demo';
      }
    }

    // Reset form state
    if (demoForm) {
      demoForm.reset();
      demoForm.classList.remove('hidden');
    }
    if (modalSuccess) {
      modalSuccess.classList.remove('active');
    }

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Attach to all [data-demo-trigger] buttons
  document.querySelectorAll('[data-demo-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.getAttribute('data-demo-type') || 'demo';
      openModal(type);
    });
  });

  // Close modal
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  // Close on overlay click (outside modal container)
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Form submission
  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Collect form data
      const formData = new FormData(demoForm);
      const data = Object.fromEntries(formData.entries());

      // Log the submission (in production, send to API)
      console.log('Demo request submitted:', data);

      // Show success state
      demoForm.classList.add('hidden');
      if (modalSuccess) {
        modalSuccess.classList.add('active');
      }
    });
  }

  // Done button in success state
  if (modalDone) {
    modalDone.addEventListener('click', closeModal);
  }

  // ─── Hero cinematic entrance (index page only) ────────────
  if (!isAboutPage && hasGSAP) {
    const heroTitle = document.getElementById('hero-title');
    const heroTagline = document.getElementById('hero-tagline');
    const heroSubContent = document.getElementById('hero-sub-content');

    if (heroTitle && heroTagline) {
      // Split text into spans for letter-wise animation
      const text = heroTitle.textContent;
      heroTitle.innerHTML = '';
      text.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(20px)';
        heroTitle.appendChild(span);
      });

      const heroEntrance = gsap.timeline({ delay: 0.2 });

      // 1. Letter-wise animation for title
      heroEntrance
        .to(heroTitle.children, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out'
        })
        // 2. Fade in tagline
        .to(heroTagline, {
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out'
        }, '-=0.4')
        // 3. Fade in sub content
        .fromTo(heroSubContent, {
          opacity: 0,
          y: 30
        }, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out'
        }, '-=0.4');
    }
  }

  // ─── Scroll reveals (all pages) ───────────────────────────
  if (hasGSAP) {
    const revealElements = document.querySelectorAll('.reveal-up');

    revealElements.forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            end: 'top 60%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // ─── Staggered card animations ──────────────────────────
    const solutionCards = document.querySelectorAll('.card-grid .glass-card');
    if (solutionCards.length) {
      gsap.fromTo(solutionCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: '.card-grid', start: 'top 82%' }
        }
      );
    }

    const industryCards = document.querySelectorAll('.industries-grid .industry-card');
    if (industryCards.length) {
      gsap.fromTo(industryCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: '.industries-grid', start: 'top 82%' }
        }
      );
    }

    const techFeatures = document.querySelectorAll('.tech-feature');
    if (techFeatures.length) {
      gsap.fromTo(techFeatures,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: '.tech-grid', start: 'top 82%' }
        }
      );
    }

    const metricItems = document.querySelectorAll('.metric-item');
    if (metricItems.length) {
      gsap.fromTo(metricItems,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: '.metrics-grid', start: 'top 82%' }
        }
      );
    }

    const workflowSteps = document.querySelectorAll('.workflow-step');
    if (workflowSteps.length) {
      gsap.fromTo(workflowSteps,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: '.workflow-steps', start: 'top 82%' }
        }
      );
    }

    // Vision/Mission cards (about page)
    const vmCards = document.querySelectorAll('.vm-card');
    if (vmCards.length) {
      gsap.fromTo(vmCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: '.vm-grid', start: 'top 82%' }
        }
      );
    }
  }

  // ─── Metrics counter animation ────────────────────────────
  if (hasGSAP) {
    const metricValues = document.querySelectorAll('.metric-value[data-target]');

    metricValues.forEach(el => {
      const target = parseFloat(el.dataset.target);
      const isFloat = target % 1 !== 0;

      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = isFloat ? obj.val.toFixed(1) : Math.round(obj.val);
            }
          });
        }
      });
    });
  }

  // ─── Smooth anchor scrolling ──────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      // Skip if it's a demo trigger (handled separately)
      if (anchor.hasAttribute('data-demo-trigger')) return;

      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      const navHeight = navbar ? navbar.offsetHeight : 72;
      const targetPos = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;

      if (hasGSAP) {
        gsap.to(window, {
          scrollTo: { y: targetPos, autoKill: true },
          duration: 1,
          ease: 'power3.inOut'
        });
      } else {
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  // ─── Performance: reduce motion preference ───────────────
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) {
    if (hasGSAP) gsap.globalTimeline.timeScale(100);
    document.querySelectorAll('.gradient-orb').forEach(orb => {
      orb.style.animation = 'none';
    });
  }

});
