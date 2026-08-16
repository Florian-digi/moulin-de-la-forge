(function () {
  "use strict";

  /* ---------- dataLayer / GTM (conteneur à créer/renseigner avant mise en ligne) ---------- */
  window.dataLayer = window.dataLayer || [];
  function pushEvent(eventName, params) {
    window.dataLayer.push(Object.assign({ event: eventName }, params || {}));
  }

  document.addEventListener("click", function (e) {
    const target = e.target.closest("[data-gtm-event]");
    if (!target) return;
    if (target.matches("form")) return;
    pushEvent(target.getAttribute("data-gtm-event"), {
      label: target.getAttribute("data-gtm-label") || undefined,
    });
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById("site-header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileNavClose = document.getElementById("mobile-nav-close");

  function openMobileNav() {
    mobileNav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeMobileNav() {
    mobileNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  menuToggle.addEventListener("click", openMobileNav);
  mobileNavClose.addEventListener("click", closeMobileNav);
  mobileNav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMobileNav);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
  /* ---------- Activités : première carte active par défaut ---------- */
  const showcaseCards = Array.from(document.querySelectorAll("#activites .showcase-card"));
  function setActiveCard(activeCard) {
    showcaseCards.forEach(function (card) {
      card.classList.toggle("is-active", card === activeCard);
    });
  }
  if (showcaseCards.length) {
    setActiveCard(showcaseCards[0]);
    showcaseCards.forEach(function (card) {
      card.addEventListener("mouseenter", function () { setActiveCard(card); });
      card.addEventListener("focus", function () { setActiveCard(card); });
      card.addEventListener("click", function () { setActiveCard(card); });
    });
    const activitesGrid = document.querySelector("#activites .showcase-grid");
    if (activitesGrid) {
      activitesGrid.addEventListener("mouseleave", function () { setActiveCard(showcaseCards[0]); });
    }
  }

  /* ---------- Déroulé : carrousel photo (3 images, rotation auto) ---------- */
  const derouleCarousel = document.getElementById("deroule-carousel");
  if (derouleCarousel && !prefersReducedMotion) {
    const slides = Array.from(derouleCarousel.querySelectorAll(".deroule-visual__slide"));
    const progressCurrent = derouleCarousel.querySelector(".deroule-visual__progress-current");
    const progressBarFill = derouleCarousel.querySelector(".deroule-visual__progress-bar span");
    if (slides.length > 1) {
      let activeIndex = 0;
      setInterval(function () {
        activeIndex = (activeIndex + 1) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle("is-active", i === activeIndex);
        });
        if (progressCurrent) progressCurrent.textContent = String(activeIndex + 1).padStart(2, "0");
        if (progressBarFill) progressBarFill.style.width = ((activeIndex + 1) / slides.length) * 100 + "%";
      }, 4500);
    }
  }

  document.querySelectorAll(".faq-item__trigger").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      const item = trigger.closest(".faq-item");
      const isOpen = item.getAttribute("data-state") === "open";
      item.setAttribute("data-state", isOpen ? "closed" : "open");
      trigger.setAttribute("aria-expanded", String(!isOpen));
      pushEvent("faq_open", { question: trigger.textContent.trim() });
    });
  });

  /* ---------- Persona cards -> pré-remplissage du formulaire ---------- */
  const reasonSelect = document.getElementById("reason");
  const goStep2Btn = document.getElementById("go-step-2");
  document.querySelectorAll("[data-persona]").forEach(function (card) {
    function selectPersona() {
      const value = card.getAttribute("data-persona");
      if (reasonSelect && value && value !== "autre") {
        reasonSelect.value = value;
      }
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
      pushEvent("select_persona", { persona: value });
    }
    card.addEventListener("click", selectPersona);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectPersona();
      }
    });
  });

  /* ---------- Formulaire en deux étapes ---------- */
  const step1 = document.getElementById("form-step-1");
  const step2 = document.getElementById("form-step-2");
  const stepLabel1 = document.getElementById("step-label-1");
  const stepLabel2 = document.getElementById("step-label-2");
  const backStep1Btn = document.getElementById("back-step-1");
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("form-status");
  let formStarted = false;

  if (form) {
    form.addEventListener(
      "input",
      function () {
        if (!formStarted) {
          formStarted = true;
          pushEvent("form_start", {});
        }
      },
      { once: true }
    );
  }

  if (goStep2Btn) {
    goStep2Btn.addEventListener("click", function () {
      // Ne valider/signaler que les champs de l'étape 1 : form.reportValidity()
      // toucherait aussi la case RGPD (requise) de l'étape 2, encore masquée
      // (display:none) et donc non focusable — ce qui lève une erreur console.
      const requiredStep1 = step1.querySelectorAll("[required]");
      let firstInvalid = null;
      requiredStep1.forEach(function (field) {
        if (!field.checkValidity() && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        firstInvalid.reportValidity();
        firstInvalid.focus();
        return;
      }
      step1.style.display = "none";
      step2.style.display = "block";
      stepLabel1.removeAttribute("data-active");
      stepLabel2.setAttribute("data-active", "true");
      pushEvent("form_step_2", {});
      step2.querySelector("select, input, textarea")?.focus();
    });
  }

  if (backStep1Btn) {
    backStep1Btn.addEventListener("click", function () {
      step2.style.display = "none";
      step1.style.display = "block";
      stepLabel2.removeAttribute("data-active");
      stepLabel1.setAttribute("data-active", "true");
    });
  }

  // NOTE IMPORTANTE — pas de backend branché pour l'instant.
  // Aucun projet Supabase n'existe encore pour Moulin de la Forge : il ne faut
  // surtout pas réutiliser l'URL/clé Supabase d'un autre client (fuite de données
  // entre clients). Cette soumission reste donc une maquette : validation complète
  // + état de succès local, sans appel réseau. Avant mise en ligne réelle,
  // brancher soit un projet Supabase dédié (table `leads`, cf. pattern
  // clients/ellipsis-succession/main.js), soit le webhook fourni par le client.
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");

      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      pushEvent("form_submit", { participants: data.participants, reason: data.reason || "" });

      form.hidden = true;
      statusEl.setAttribute("data-state", "success");
      statusEl.textContent = "Merci, votre demande a été enregistrée. Nous revenons vers vous rapidement pour construire votre proposition.";
    });
  }

  /* ---------- Année footer ---------- */
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
