/* ==========================================================================
   STEFAN CARTER | PAGE TRANSITIONS
   Loaded in <head> as a classic, blocking script on purpose: pagereveal
   fires before the new page's first frame, so a deferred or end-of-body
   script would register its listener too late. The motion is all CSS
   (styles.css section 20); this only tells it which blocks to move.
   1. Leaving: name the nav and the blocks in view, and tag how each exits
   2. Arriving: hold the entrance until the old blocks are off the board
   3. Clicks during the swap and the entrance: pass them on to the link
      under the pointer
   4. Prefetch on hover, so a swap starts the moment a link is pressed
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var MAX_STEP = 6;   /* the .vt-s0 to .vt-s6 stagger classes in styles.css */
  var named = [];

  function name(el, id, classes) {
    el.style.setProperty("view-transition-name", id);
    el.style.setProperty("view-transition-class", classes);
    named.push(el);
  }

  function unname() {
    named.forEach(function (el) {
      el.style.removeProperty("view-transition-name");
      el.style.removeProperty("view-transition-class");
    });
    named = [];
  }

  /* --- 1. Leaving -------------------------------------------------------------
     Only blocks that can be seen get a name, because every name is a
     snapshot and a long case study has dozens of cells nobody can see. Lanes
     alternate direction, and within a lane the block nearest the exit goes
     first, so no block has to pass through another to get out. The rail is
     a row's first child, plus any label stacked into the rail column on a
     narrow screen. */
  window.addEventListener("pageswap", function (e) {
    var nav = document.querySelector(".cert-nav");
    var sheet = document.querySelector(".sheet");
    /* No nav or sheet means the page never got that far, e.g. the old
       /work?filter=web link, which redirects from <head>. */
    if (!e.viewTransition || !nav || !sheet) return;
    unname();

    /* The bar is named here, not in the stylesheet, so it is only ever an
       outgoing snapshot: see the vt-nav rule in styles.css section 20. */
    name(nav, "vt-nav", "none");

    var top = nav.getBoundingClientRect().bottom;
    var bottom = window.innerHeight;
    var left = sheet.getBoundingClientRect().left;
    var count = 0;
    var lane = 0;

    function inView(box) { return box.bottom > top && box.top < bottom; }

    sheet.querySelectorAll(".crow, .cert-form > .form-stack").forEach(function (row) {
      if (!inView(row.getBoundingClientRect())) return;

      var isRow = row.classList.contains("crow");
      var dir = lane % 2 ? "vt-l" : "vt-r";
      var blocks = [];

      Array.prototype.forEach.call(isRow ? row.children : [row], function (el, i) {
        var box = el.getBoundingClientRect();
        if (!inView(box)) return;
        if (isRow && (i === 0 || (el.classList.contains("vlabel") && box.left - left < 1))) {
          name(el, "vt-b" + count++, "vt-block vt-rail");
        } else {
          blocks.push({ el: el, box: box });
        }
      });

      blocks.sort(function (a, b) {
        var edge = dir === "vt-r" ? b.box.right - a.box.right : a.box.left - b.box.left;
        return Math.round(edge) || a.box.top - b.box.top;
      });
      blocks.forEach(function (block, i) {
        name(block.el, "vt-b" + count++,
          "vt-block " + dir + " vt-s" + Math.min(lane + i, MAX_STEP));
      });
      lane++;
    });
  });

  /* --- 2. Arriving ------------------------------------------------------------
     The new page is never snapshotted. It assembles with the same CSS
     entrance a direct load gets, seen live through the transition, and
     html.vt-arrive holds that entrance until the old blocks are clear. The
     class is set afresh on every reveal and never cleared once the entrance
     is running, because changing animation-delay mid-flight makes the blocks
     jump. */
  window.addEventListener("pagereveal", function (e) {
    /* A page restored from the back/forward cache still carries the names it
       was given on the way out, and they would collide with the next page's. */
    unname();

    var transition = e.viewTransition;
    root.classList.toggle("vt-arrive", !!transition);
    if (!transition) return;

    /* A skipped transition has nothing to wait for. */
    transition.ready.catch(function () { root.classList.remove("vt-arrive"); });

    /* Restart the entrance, so a page restored from the cache reassembles
       instead of appearing already built. A freshly loaded page has not drawn
       a frame yet, so for it the restart changes nothing. */
    var sheet = document.querySelector(".sheet-in");
    if (sheet) {
      sheet.classList.remove("sheet-in");
      void sheet.offsetWidth;
      sheet.classList.add("sheet-in");
    }
  });

  /* --- 3. Clicks during the swap ----------------------------------------------
     While a transition runs, the browser sends every click to <html>, and
     elementFromPoint answers <html> too, even with pointer-events: none on
     the overlay. The new page looks finished before the transition is (the
     old nav's fade ends last), so a reader who clicks straight away would
     lose the click and have to click again. A click that began during the
     transition and landed on <html> is passed on to the link drawn under the
     pointer instead. The new page is live underneath, so its links are where
     they look, and no old block ever covers a new one: lanes clear before
     they refill. */
  var swapping = false;   /* a transition is on screen */
  var pressed = false;    /* the current press began while one was */

  function linkAt(x, y) {
    function hit(box) {
      return x >= box.left && x < box.right && y >= box.top && y < box.bottom;
    }
    /* The nav sits over the sheet, so a point on it can only mean the nav. */
    var nav = document.querySelector(".cert-nav");
    var scope = nav && hit(nav.getBoundingClientRect()) ? nav : document.querySelector(".sheet");
    /* A project row is one link: its case-study link is stretched over the
       whole row by a pseudo-element (styles.css, section 21), and a
       pseudo-element has no box to measure. */
    var rows = scope ? scope.querySelectorAll(".project-item") : [];
    for (var r = 0; r < rows.length; r++) {
      var rowLink = rows[r].querySelector("a[href]");
      if (rowLink && hit(rows[r].getBoundingClientRect())) return rowLink;
    }
    var links = scope ? scope.querySelectorAll("a[href]") : [];
    for (var i = 0; i < links.length; i++) {
      /* A row clips the blocks still sliding into it. */
      var row = links[i].closest(".crow");
      if (row && !hit(row.getBoundingClientRect())) continue;
      var boxes = links[i].getClientRects();
      for (var j = 0; j < boxes.length; j++) {
        if (hit(boxes[j])) return links[i];
      }
    }
    return null;
  }

  function settled() { swapping = false; }

  window.addEventListener("pagereveal", function (e) {
    swapping = !!e.viewTransition;
    if (swapping) e.viewTransition.finished.then(settled, settled);
  });

  document.addEventListener("pointerdown", function () { pressed = swapping; }, true);

  document.addEventListener("click", function (e) {
    var relay = pressed && e.target === root;
    pressed = false;
    /* Plain clicks only. Safari will not open a tab from a script's click,
       so a passed-on ctrl or cmd click would replace this page instead,
       which is worse than losing it. */
    if (!relay || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var link = linkAt(e.clientX, e.clientY);
    if (link) link.click();
  }, true);

  /* The entrance has the same problem on a smaller scale. A project row's
     link is stretched over the row by a positioned pseudo-element, and while
     the row's cells are still sliding in, each moving cell becomes that
     pseudo-element's containing block. For the first half-second of a page
     the link covers only its own cell, so a click on the title lands on the
     row and is passed on from here. Registered from <head> so it is live
     from the first frame. Plain clicks only, as above; once the row has
     settled, the stretched link takes modified clicks itself. */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var row = e.target.closest && e.target.closest(".project-item");
    if (!row || e.target.closest("a, button")) return;
    var link = row.querySelector("a[href]");
    if (link) link.click();
  });

  /* --- 4. Prefetch on hover ---------------------------------------------------
     A transition can only start once the next page has arrived, so the
     network wait shows up as dead time between the click and the motion.
     Speculation rules fetch a same-site page while the pointer rests on its
     link, in Chrome and Safari. HTTPS only: Safari refuses a prefetch over
     plain http and logs an error for every hover, which would litter a local
     preview's console for no gain. */
  if (location.protocol === "https:" && HTMLScriptElement.supports &&
      HTMLScriptElement.supports("speculationrules")) {
    var rules = document.createElement("script");
    rules.type = "speculationrules";
    rules.textContent = JSON.stringify({
      prefetch: [{ where: { href_matches: "/*" }, eagerness: "moderate" }]
    });
    document.head.appendChild(rules);
  }
})();
