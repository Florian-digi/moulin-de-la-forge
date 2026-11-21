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

  /* ---------- Dates & heures du séjour ---------- */
  // Calendrier natif (s'adapte seul à desktop / iOS / Android). Règles :
  // arrivée à partir d'aujourd'hui, départ au moins le lendemain de l'arrivée.
  const arrivalDate = document.getElementById("arrivalDate");
  const departureDate = document.getElementById("departureDate");

  function pad2(n) { return String(n).padStart(2, "0"); }
  function toISODate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDays(iso, days) {
    const parts = iso.split("-").map(Number);
    return toISODate(new Date(parts[0], parts[1] - 1, parts[2] + days));
  }

  function syncDepartureMin() {
    if (!arrivalDate || !departureDate) return;
    const today = toISODate(new Date());
    arrivalDate.min = today;
    departureDate.min = addDays(arrivalDate.value || today, 1);
    // Arrivée déplacée après (ou le jour du) départ : on vide le départ plutôt
    // que de laisser une combinaison impossible.
    if (departureDate.value && departureDate.value < departureDate.min) {
      departureDate.value = "";
    }
    departureDate.setCustomValidity("");
  }

  function validateDeparture() {
    if (!arrivalDate || !departureDate) return;
    const invalid = arrivalDate.value && departureDate.value && departureDate.value <= arrivalDate.value;
    departureDate.setCustomValidity(invalid ? "La date de départ doit être au moins le lendemain de la date d'arrivée." : "");
  }

  if (arrivalDate && departureDate) {
    syncDepartureMin();
    arrivalDate.addEventListener("change", syncDepartureMin);
    departureDate.addEventListener("change", validateDeparture);
    // Chrome/Edge desktop n'ouvrent le calendrier qu'au clic sur l'icône :
    // on l'ouvre au clic n'importe où dans le champ.
    [arrivalDate, departureDate].forEach(function (input) {
      input.addEventListener("click", function () {
        if (typeof input.showPicker === "function") {
          try { input.showPicker(); } catch (err) { /* navigateur qui refuse : picker natif par défaut */ }
        }
      });
    });
  }

  // Heures : créneaux de 30 min de 7h à 22h, en <select> pour avoir la roue
  // native sur mobile et une liste simple sur desktop.
  document.querySelectorAll("[data-time-select]").forEach(function (select) {
    for (let minutes = 7 * 60; minutes <= 22 * 60; minutes += 30) {
      const h = Math.floor(minutes / 60);
      const m = pad2(minutes % 60);
      const option = document.createElement("option");
      option.value = pad2(h) + ":" + m;
      option.textContent = h + "h" + m;
      select.appendChild(option);
    }
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
      // Inclut les champs non requis (dates) pour bloquer un départ avant l'arrivée.
      validateDeparture();
      const fieldsStep1 = step1.querySelectorAll("input, select");
      let firstInvalid = null;
      fieldsStep1.forEach(function (field) {
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

  // Leads : 2 appels indépendants (pattern LP clients, cf. clients/RMB avocat/main.js)
  //  1. archivage dans Supabase « Landing pages Clients », table `leads` (anon = INSERT seul)
  //  2. webhook n8n → mail d'alerte (scénario : n8n/workflow-leads-mail.json)
  // Le webhook part en fire-and-forget : si Supabase tombe, le mail part quand même.
  const SOURCE = "moulin-de-la-forge";
  const SUPABASE_URL = "https://pnaizymghnhvhzwzitja.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYWl6eW1naG5odmh6d3ppdGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDY4ODAsImV4cCI6MjA5NDkyMjg4MH0.5ZB4NPx7t4glHTdlimC9QCVGDMkEwPvPP4o8fotyG_4";
  const N8N_WEBHOOK = "https://n8n.srv1293539.hstgr.cloud/webhook/moulin-de-la-forge";
  const TRACKING_PARAMS = ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  function generateLeadId() {
    const bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    return "LEAD-" + Array.from(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  }

  // Libellé lisible d'un <select> (pour le mail), vide si rien de choisi
  function selectLabel(id) {
    const select = document.getElementById(id);
    if (!select || !select.value) return "";
    return select.options[select.selectedIndex].textContent.trim();
  }

  // Date ISO (aaaa-mm-jj) → jj/mm/aaaa
  function frDate(iso) {
    if (!iso) return "";
    const p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");

      // Honeypot rempli = bot : on ignore sans rien signaler
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const leadId = generateLeadId();
      const urlParams = new URLSearchParams(window.location.search);
      const tracking = {};
      TRACKING_PARAMS.forEach(function (key) {
        const value = urlParams.get(key);
        if (value) tracking[key] = value.slice(0, 500);
      });

      const lead = {
        source: SOURCE,
        lead_id: leadId,
        prenom: data.firstName,
        nom: data.lastName,
        email: data.email,
        telephone: data.phone || "",
        societe: data.company || "",
        fonction: selectLabel("reason"),
        participants: data.participants,
        format: selectLabel("format"),
        date_arrivee: frDate(data.arrivalDate),
        heure_arrivee: selectLabel("arrivalTime"),
        date_depart: frDate(data.departureDate),
        heure_depart: selectLabel("departureTime"),
        chambres: selectLabel("rooms"),
        budget: selectLabel("budget"),
        message: data.message || "",
        page: window.location.href,
        date_heure: new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        date_iso: new Date().toISOString(),
      };

      const submitButton = form.querySelector('button[type="submit"]');
      const submitLabel = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = "Envoi en cours…";

      // 1. Alerte mail n8n — fire-and-forget, ne bloque pas l'enregistrement
      const webhookCall = fetch(N8N_WEBHOOK, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({}, lead, tracking)),
      }).catch(function (err) {
        console.error("n8n webhook error:", err);
        return null;
      });

      // 2. Archivage Supabase
      let saved = false;
      try {
        const response = await fetch(SUPABASE_URL + "/rest/v1/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            source: SOURCE,
            nom: [lead.prenom, lead.nom].filter(Boolean).join(" "),
            email: lead.email,
            telephone: lead.telephone,
            message: lead.message,
            metadata: Object.assign({
              lead_id: leadId,
              consent: data.consent === "on", // preuve RGPD : case cochée au moment de l'envoi
              prenom: lead.prenom,
              societe: lead.societe,
              fonction: lead.fonction,
              participants: lead.participants,
              format: lead.format,
              date_arrivee: data.arrivalDate || "",
              heure_arrivee: lead.heure_arrivee,
              date_depart: data.departureDate || "",
              heure_depart: lead.heure_depart,
              chambres: lead.chambres,
              budget: lead.budget,
              page: lead.page,
            }, tracking),
          }),
        });
        saved = response.ok;
        if (!response.ok) console.error("Supabase insert failed:", response.status);
      } catch (err) {
        console.error("Supabase error:", err);
      }

      // Le lead est perdu seulement si les DEUX appels ont échoué
      if (!saved) {
        const webhookResponse = await webhookCall;
        saved = !!(webhookResponse && webhookResponse.ok);
      }

      if (!saved) {
        submitButton.disabled = false;
        submitButton.innerHTML = submitLabel;
        statusEl.setAttribute("data-state", "error");
        statusEl.textContent = "L'envoi n'a pas abouti. Merci de réessayer dans un instant, ou de nous appeler au +33 (0)3 44 49 61 31.";
        return;
      }

      pushEvent("form_submit", { lead_id: leadId, participants: data.participants, reason: data.reason || "" });

      form.hidden = true;
      statusEl.setAttribute("data-state", "success");
      statusEl.textContent = "Merci, votre demande a été enregistrée. Nous revenons vers vous rapidement pour construire votre proposition.";
    });
  }

  /* ---------- Année footer ---------- */
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
