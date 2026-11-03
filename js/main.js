/* ==========================================================================
   STEFAN CARTER - PORTFOLIO INTERACTIONS
   1. Scroll-reveal via IntersectionObserver (respects reduced motion)
   2. Footer: current year
   3. Contact form: fetch submit with an inline status message
   4. Self-scrolling captures: a real pause control, not hover-only
   5. Halftone prints: project thumbnails and the portrait
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

  /* --- 5. Halftone prints -------------------------------------------------------
     The index thumbnails and the portrait are reprinted as square halftones:
     the image is read at one sample per CSS pixel, cropped the way its own
     object-fit: cover and object-position crop it, and averaged over a grid
     of square cells, each printed as one square.

     The print should still be recognisably the picture it stands for, so
     the screen is fine and the tones follow the image: a square's area is
     the share of ink in its cell, and a full cell prints solid. Each image's
     tones are stretched to the full range.

     A thumbnail takes its image's minority tone as its ink, so a mostly dark
     capture prints white squares on black and a light one black squares on
     white. Either way the large flat areas are clean ground rather than a
     field of nearly touching squares. The portrait is an inked
     illustration on white, so it always prints black squares and leaves
     its white unprinted: the section colour of its cell is the paper.

     The print is drawn at the screen's own pixel density so every square has
     a hard edge, and is redrawn whenever its well changes size. Hovering or
     focusing a project row hides its print and the real image shows through
     (styles.css, section 21). Without script, or if a browser will not let
     the canvas be read back, the images are simply the images. */
  var HALFTONE_CELL = 3;       /* CSS px a side: smaller is closer to the image */
  var ASSEMBLE_MS = 650;       /* one square's pull into place */
  var ASSEMBLE_STAGGER = 250;  /* the spread of start times across the squares */
  var MAGNET_REACH = 14;       /* cells: how far the pointer's magnet reaches */

  /* Lay a print out: which squares it has, how big, and where each sits at
     rest, in device pixels. Nothing is drawn here (see drawPrint). Returns
     null until the image can be read. */
  var layoutPrint = function (img, canvas, inkOnly) {
    var well = canvas.parentNode;
    var w = well.clientWidth;
    var h = well.clientHeight;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;
    if (!w || !h || !iw || !ih) return null;

    // Frame the picture exactly as the image itself would be framed: cover
    // or contain, from its object-position.
    var style = getComputedStyle(img);
    var focus = style.objectPosition.split(" ").map(function (v) {
      return /%$/.test(v) ? parseFloat(v) / 100 : 0.5;
    });

    var sample = document.createElement("canvas");
    sample.width = w;
    sample.height = h;
    var sctx = sample.getContext("2d", { willReadFrequently: true });
    var scale = (style.objectFit === "contain" ? Math.min : Math.max)(w / iw, h / ih);
    sctx.fillStyle = "#fff";
    sctx.fillRect(0, 0, w, h);
    sctx.drawImage(img, (w - iw * scale) * focus[0], (h - ih * scale) * focus[1], iw * scale, ih * scale);

    var px;
    try {
      px = sctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      canvas.remove();
      return null;
    }

    // Average lightness per cell, 0 black to 1 white. The grid is centred,
    // so the part-cells at opposite edges match.
    var cell = HALFTONE_CELL;
    var cols = Math.ceil(w / cell);
    var rows = Math.ceil(h / cell);
    var ox = (w - cols * cell) / 2;
    var oy = (h - rows * cell) / 2;
    var light = new Float32Array(cols * rows);
    var mean = 0;

    for (var r = 0; r < rows; r++) {
      var y0 = Math.max(0, Math.floor(oy + r * cell));
      var y1 = Math.min(h, Math.floor(oy + (r + 1) * cell));
      for (var c = 0; c < cols; c++) {
        var x0 = Math.max(0, Math.floor(ox + c * cell));
        var x1 = Math.min(w, Math.floor(ox + (c + 1) * cell));
        var sum = 0;
        var n = 0;
        for (var y = y0; y < y1; y++) {
          for (var x = x0; x < x1; x++) {
            var i = (y * w + x) * 4;
            sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            n++;
          }
        }
        light[r * cols + c] = n ? sum / n / 255 : 1;
        mean += light[r * cols + c];
      }
    }
    mean /= light.length;

    // The minority tone is the ink; how much of it each cell holds is its tone.
    var reversed = !inkOnly && mean < 0.5;
    var tone = new Float32Array(light.length);
    for (var t = 0; t < tone.length; t++) tone[t] = reversed ? light[t] : 1 - light[t];

    // Stretch to the full range, from the 2nd to the 98th percentile, so a
    // low-contrast capture still prints from clean ground to full squares.
    var sorted = Array.prototype.slice.call(tone).sort(function (a, b) { return a - b; });
    var lo = sorted[Math.floor(sorted.length * 0.02)];
    var hi = sorted[Math.floor(sorted.length * 0.98)];
    var range = Math.max(hi - lo, 0.05);

    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    var cellCol = [];
    var cellRow = [];
    var lefts = [];
    var tops = [];
    var sizes = [];
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        // Only the bottom few percent of the range clips to clean ground, so
        // flat areas print flat without losing the image's quieter detail.
        var ink = Math.min(1, Math.max(0, ((tone[r * cols + c] - lo) / range - 0.04) / 0.96));
        if (!ink) continue;
        // Sized once in device pixels and placed whole, so a square stays
        // square wherever a fractional grid origin falls.
        var size = Math.round(cell * Math.sqrt(ink) * dpr);
        if (size < 1) continue;
        cellCol.push(c);
        cellRow.push(r);
        lefts.push((ox + (c + 0.5) * cell) * dpr - size / 2);
        tops.push((oy + (r + 0.5) * cell) * dpr - size / 2);
        sizes.push(size);
      }
    }

    return {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      ground: inkOnly ? null : reversed ? "#000" : "#fff",
      ink: reversed ? "#fff" : "#000",
      cell: cell,
      step: cell * dpr,
      ox: ox,
      oy: oy,
      cols: cols,
      rows: rows,
      n: sizes.length,
      col: Int16Array.from(cellCol),
      row: Int16Array.from(cellRow),
      left: Float32Array.from(lefts),
      top: Float32Array.from(tops),
      size: Uint16Array.from(sizes),
      // Each square's distance from home, in whole cells: motion moves a
      // square from cell to cell, never part of the way across one.
      dx: new Int16Array(sizes.length),
      dy: new Int16Array(sizes.length),
      shown: false
    };
  };

  /* Draw a print as it stands: the ground, then (once the print is shown)
     every square at its home plus its current offset. */
  var drawPrint = function (p) {
    var ctx = p.ctx;
    ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    if (p.ground) {
      ctx.fillStyle = p.ground;
      ctx.fillRect(0, 0, p.canvas.width, p.canvas.height);
    }
    if (!p.shown) return;
    ctx.fillStyle = p.ink;
    for (var i = 0; i < p.n; i++) {
      ctx.fillRect(Math.round(p.left[i] + p.dx[i] * p.step), Math.round(p.top[i] + p.dy[i] * p.step), p.size[i], p.size[i]);
    }
  };

  /* The entrance, once per image as it first comes into view. Every square
     starts thrown outward from the picture's centre by a random amount,
     some of them off the canvas altogether, and is pulled home like a
     filing to a magnet: slowly at first, then harder as it closes, landing
     with a snap. Squares only ever sit on whole cells, so the motion steps
     along the grid like the rest of the site rather than gliding. */
  var assemble = function (state) {
    var p = state.print;
    var n = p.n;
    var fromX = new Float32Array(n);
    var fromY = new Float32Array(n);
    var wait = new Float32Array(n);
    var cx = p.cols / 2;
    var cy = p.rows / 2;
    for (var i = 0; i < n; i++) {
      var fling = 0.3 + Math.random() * 0.9;
      fromX[i] = (p.col[i] - cx) * fling + (Math.random() - 0.5) * 8;
      fromY[i] = (p.row[i] - cy) * fling + (Math.random() - 0.5) * 8;
      wait[i] = Math.random() * ASSEMBLE_STAGGER;
    }
    p.shown = true;
    state.phase = "assembling";

    var start = 0;
    var frame = function (now) {
      // Laid out again mid-flight (a resize): the new layout drew itself whole.
      if (state.print !== p) return;
      if (!start) start = now;
      var moving = false;
      for (var j = 0; j < n; j++) {
        var t = Math.min(1, Math.max(0, (now - start - wait[j]) / ASSEMBLE_MS));
        var pull = 1 - t * t;
        p.dx[j] = Math.round(fromX[j] * pull);
        p.dy[j] = Math.round(fromY[j] * pull);
        if (t < 1) moving = true;
      }
      drawPrint(p);
      if (moving) requestAnimationFrame(frame);
      else state.phase = "done";
    };
    requestAnimationFrame(frame);
  };

  /* The portrait's magnet: squares within reach of the pointer are pushed
     straight away from it, the nearest furthest, and drop back home the
     moment it moves on. As with the entrance, every push is a whole number
     of cells. Only once the portrait has assembled. */
  var magnetise = function (well, state) {
    var px = 0;
    var py = 0;
    var near = false;
    var queued = 0;

    var apply = function () {
      queued = 0;
      var p = state.print;
      if (!p || state.phase !== "done") return;
      var reach = MAGNET_REACH;
      for (var i = 0; i < p.n; i++) {
        var ax = p.col[i] + 0.5 - px;
        var ay = p.row[i] + 0.5 - py;
        var dx = 0;
        var dy = 0;
        if (near && ax < reach && ax > -reach && ay < reach && ay > -reach) {
          var d = Math.sqrt(ax * ax + ay * ay);
          if (d > 0 && d < reach) {
            var push = (reach - d) * 0.8 / d;
            dx = Math.round(ax * push);
            dy = Math.round(ay * push);
          }
        }
        p.dx[i] = dx;
        p.dy[i] = dy;
      }
      drawPrint(p);
    };
    var queue = function () {
      if (!queued) queued = requestAnimationFrame(apply);
    };

    well.addEventListener("pointermove", function (e) {
      var p = state.print;
      if (!p) return;
      var box = p.canvas.getBoundingClientRect();
      px = (e.clientX - box.left - p.ox) / p.cell;
      py = (e.clientY - box.top - p.oy) / p.cell;
      near = true;
      queue();
    });
    well.addEventListener("pointerleave", function () {
      near = false;
      queue();
    });
  };

  var wells = document.querySelectorAll(".project-item .c-shot, .c-portrait");

  if (wells.length && "ResizeObserver" in window) {
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var states = new WeakMap();

    /* Assemble a print once it is both laid out and in view, and once the
       cell it sits in has landed: on arrival the page's own entrance slides
       every cell in (styles.css, section 20), and squares converging on a
       cell that is still moving read as one blur rather than two moves.
       Reduced motion skips straight to the finished picture. */
    var maybeAssemble = function (state) {
      if (state.phase !== "waiting" || !state.inView || !state.print) return;
      if (reduceMotion) {
        state.print.shown = true;
        state.phase = "done";
        drawPrint(state.print);
        return;
      }
      state.phase = "queued";
      var cell = state.canvas.closest(".cell");
      var landing = cell && cell.getAnimations ? cell.getAnimations() : [];
      Promise.all(landing.map(function (a) { return a.finished; }))
        .catch(function () {})
        .then(function () { assemble(state); });
    };

    var relayout = function (well) {
      var state = states.get(well);
      var p = layoutPrint(state.img, state.canvas, state.inkOnly);
      if (!p) return;
      state.print = p;
      // Once a print has started to assemble, a new layout shows it whole.
      if (state.phase === "assembling" || state.phase === "done") {
        p.shown = true;
        state.phase = "done";
      }
      drawPrint(p);
      // A transparent print needs the image under it hidden (styles.css).
      well.classList.add("is-printed");
      maybeAssemble(state);
    };

    var reprint = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { relayout(entry.target); });
    });

    var arrive = "IntersectionObserver" in window && new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var state = states.get(entry.target);
        state.inView = true;
        arrive.unobserve(entry.target);
        maybeAssemble(state);
      });
    }, { threshold: 0.25 });

    wells.forEach(function (well) {
      var img = well.querySelector("img");
      if (!img) return;
      var canvas = document.createElement("canvas");
      canvas.className = "c-print";
      canvas.setAttribute("aria-hidden", "true");
      well.appendChild(canvas);

      var inkOnly = well.classList.contains("c-portrait");
      var state = { img: img, canvas: canvas, inkOnly: inkOnly, print: null, inView: !arrive, phase: "waiting" };
      states.set(well, state);

      img.addEventListener("load", function () { relayout(well); });
      reprint.observe(well);
      if (arrive) arrive.observe(well);
      if (inkOnly && finePointer && !reduceMotion) magnetise(well, state);
    });
  }
})();
