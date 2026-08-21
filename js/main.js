/* ==========================================================================
   STEFAN CARTER - PORTFOLIO INTERACTIONS
   1. Navbar: hairline border once the page scrolls
   2. Mobile nav: close the collapse after tapping a link
   3. Work section: shuffled project order + category filtering
   4. Scroll-reveal via IntersectionObserver (respects reduced motion)
   5. Footer: current year
   ========================================================================== */
(function () {
  "use strict";

  /* --- 1. Navbar scroll state -------------------------------------------- */
  var nav = document.querySelector(".site-nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- 2. Auto-close the mobile menu on link click ------------------------ */
  var navMenu = document.getElementById("navMenu");
  if (navMenu && window.bootstrap) {
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (navMenu.classList.contains("show")) {
          bootstrap.Collapse.getOrCreateInstance(navMenu, { toggle: false }).hide();
        }
      });
    });
  }

  /* --- 3. Project filtering ----------------------------------------------- */
  var filterButtons = document.querySelectorAll(".filter-btn");
  var projectGrid = document.getElementById("projectGrid");

  /* Shuffle the project order on every load so no single project owns the
     top slot. Runs before anything caches the list, and renumbers the
     vertical labels so they still read 01, 02, 03... down the page. */
  if (projectGrid) {
    var shuffled = Array.prototype.slice.call(
      projectGrid.querySelectorAll(".project-item")
    );
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = swap;
    }
    var frag = document.createDocumentFragment();
    shuffled.forEach(function (item, index) {
      var label = item.querySelector(".vlabel");
      if (label) label.textContent = ("0" + (index + 1)).slice(-2);
      frag.appendChild(item);
    });
    projectGrid.appendChild(frag);
  }

  var projectItems = document.querySelectorAll(".project-item");

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.dataset.filter;

      // Toggle the active pill (visual + assistive state)
      filterButtons.forEach(function (b) {
        var isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      // Clear previous animation classes, then show/hide
      projectItems.forEach(function (item) {
        item.classList.remove("card-in");
        var show = filter === "all" || item.dataset.category === filter;
        item.classList.toggle("is-hidden", !show);
      });

      // Force a reflow so the entry animation restarts for visible cards
      if (projectGrid) void projectGrid.offsetWidth;

      projectItems.forEach(function (item) {
        if (!item.classList.contains("is-hidden")) {
          item.classList.add("card-in");
        }
      });
    });
  });

  /* Preselect a filter from the URL, e.g. work.html?filter=web
     (linked from the services rows on the home page) */
  var presetFilter = new URLSearchParams(window.location.search).get("filter");
  if (presetFilter) {
    var presetBtn = document.querySelector('.filter-btn[data-filter="' + presetFilter + '"]');
    if (presetBtn && !presetBtn.classList.contains("is-active")) presetBtn.click();
  }

  /* --- 4. Scroll-reveal ---------------------------------------------------- */
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

  /* --- 5. Footer year ------------------------------------------------------ */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
