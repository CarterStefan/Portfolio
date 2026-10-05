/* ==========================================================================
   STEFAN CARTER - PORTFOLIO INTERACTIONS
   1. Scroll-reveal via IntersectionObserver (respects reduced motion)
   2. Footer: current year
   3. Contact form: fetch submit with an inline status message
   4. Self-scrolling captures: a real pause control, not hover-only
   ========================================================================== */
(function () {
  "use strict";

  /* --- 1. Scroll-reveal ---------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    // No observer support or reduced motion: show everything immediately
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* --- 2. Footer year ------------------------------------------------------ */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* --- 3. Contact form ------------------------------------------------------
     Progressive enhancement over the plain POST: without JS the form still
     submits to Formspree and Formspree's own confirmation page is shown.
     With JS, the submit is intercepted so the visitor never leaves the sheet,
     and #cf-status (role="status", aria-live="polite") reports the outcome to
     everyone, not just sighted users watching the button. */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("cf-status");

  if (form && status && window.fetch) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      status.textContent = "Sending.";
      btn.disabled = true;

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          status.textContent = "Sent. I will come back to you shortly.";
        })
        .catch(function () {
          status.textContent =
            "That did not send. Email carter_stefan@outlook.com instead.";
        })
        .then(function () { btn.disabled = false; });
    });
  }

  /* --- 4. Pause control for self-scrolling captures --------------------------
     .shot-scroll's glide only runs once html.js is present (see styles.css),
     so a no-JS visitor gets a static image and never needs this control. With
     JS, the animation is gated on .is-paused rather than :hover, since hover
     is not a pause mechanism a touch or keyboard visitor can reach - WCAG
     2.2.2 asks for exactly this. */
  document.querySelectorAll(".shot-pause").forEach(function (btn) {
    var frame = btn.closest(".shot-scroll");
    if (!frame) return;
    btn.addEventListener("click", function () {
      var paused = frame.classList.toggle("is-paused");
      btn.setAttribute("aria-pressed", String(paused));
      btn.textContent = paused ? "Play" : "Pause";
    });
  });
})();
