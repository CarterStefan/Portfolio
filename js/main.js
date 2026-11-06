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
     the canvas be read back, the images are simply the images.

     Once printed, the portrait follows the pointer about the page: the face
     turns toward it, and (with LOOK_EYES) a pair of eyes behind the glasses
     watches it. */
  var HALFTONE_CELL = 3;       /* CSS px a side: smaller is closer to the image */
  var ASSEMBLE_MS = 650;       /* one square's pull into place */
  var ASSEMBLE_STAGGER = 250;  /* the spread of start times across the squares */
  var LOOK_TURN = 0.3;        /* how far the face turns, as a share of the head's radius */
  var LOOK_PITCH = 0.6;        /* nodding is stiffer than turning: a share of the turn */
  var LOOK_REACH = 360;        /* CSS px from the face at which the look is half its full */
  var LOOK_EASE = 0.14;        /* share of the remaining turn made in each 60th of a second */
  var LOOK_EYES = false;       /* pupils behind the glasses that watch, and blink */
  var BLINK_MS = 170;          /* one blink, closed and open again */

  /* The portrait in its own pixels (assets/img/stefan/portrait.webp, 692 by
     947): the head, and the inside of each lens of the glasses. */
  var FACE = { cx: 345, cy: 473, rx: 279, ry: 407 };
  var LENSES = [
    { cx: 217, cy: 445, rx: 93, ry: 64 },
    { cx: 487, cy: 445, rx: 93, ry: 64 }
  ];

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

    // Every cell's square size, ink or not, so the portrait's turn can read
    // any cell of the print from any other.
    var grid = new Uint16Array(cols * rows);
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
        grid[r * cols + c] = size;
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
      dpr: dpr,
      step: cell * dpr,
      // Where the picture itself lies in the well, in CSS px.
      imgX: (w - iw * scale) * focus[0],
      imgY: (h - ih * scale) * focus[1],
      imgScale: scale,
      grid: grid,
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
      else {
        state.phase = "done";
        if (state.redraw) state.redraw();
      }
    };
    requestAnimationFrame(frame);
  };

  /* The portrait's gaze. The head is taken as a ball: turning it moves each
     point by how far that point stands out toward the viewer, so the
     glasses and beard swing furthest, the outline of the head stays put,
     and the side it turns toward gathers up while the far side opens out.
     The grid never moves. Each cell instead prints the square of the cell
     the turn brings into it, so the picture steps through the grid like the
     rest of the site and no gaps open between squares.

     With LOOK_EYES, a pupil behind each lens looks further than the head
     turns, and now and then blinks. */
  var drawLook = function (state) {
    var p = state.print;
    var look = state.look;
    var ctx = p.ctx;
    var cols = p.cols;
    var rows = p.rows;
    var dpr = p.dpr;
    var cell = p.cell;
    var toCol = function (x) { return (p.imgX + x * p.imgScale - p.ox) / cell; };
    var toRow = function (y) { return (p.imgY + y * p.imgScale - p.oy) / cell; };
    var toCells = function (d) { return d * p.imgScale / cell; };

    var hcx = toCol(FACE.cx);
    var hcy = toRow(FACE.cy);
    var hrx = toCells(FACE.rx);
    var hry = toCells(FACE.ry);
    var turnX = LOOK_TURN * hrx * look.x;
    var turnY = LOOK_TURN * LOOK_PITCH * hry * look.y;
    var depth = function (c, r) {
      var nx = (c - hcx) / hrx;
      var ny = (r - hcy) / hry;
      var q = 1 - nx * nx - ny * ny;
      return q > 0 ? Math.sqrt(q) : 0;
    };

    ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    ctx.fillStyle = p.ink;
    for (var r = 0; r < rows; r++) {
      var top = (p.oy + (r + 0.5) * cell) * dpr;
      for (var c = 0; c < cols; c++) {
        var z = depth(c + 0.5, r + 0.5);
        var sc = c;
        var sr = r;
        if (z) {
          sc = c - Math.round(z * turnX);
          sr = r - Math.round(z * turnY);
          if (sc < 0 || sc >= cols || sr < 0 || sr >= rows) continue;
        }
        var size = p.grid[sr * cols + sc];
        if (!size) continue;
        ctx.fillRect(Math.round((p.ox + (c + 0.5) * cell) * dpr - size / 2), Math.round(top - size / 2), size, size);
      }
    }
    if (!LOOK_EYES) return;

    // The pupils: solid discs of whole squares, carried with the face and
    // then turned within their lenses, each with a catchlight left unprinted.
    var full = Math.round(cell * dpr);
    var open = 1 - state.blink;
    LENSES.forEach(function (lens) {
      var lc = toCol(lens.cx);
      var lr = toRow(lens.cy);
      var lrx = toCells(lens.rx);
      var lry = toCells(lens.ry);
      var z = depth(lc, lr);
      var radius = lry * 0.34;
      var px = lc + z * turnX + look.x * (lrx - radius) * 0.7;
      var py = lr + z * turnY + look.y * (lry - radius) * 0.55;
      var ry = Math.max(radius * open, 0.5);
      var glintX = px - radius * 0.4;
      var glintY = py - radius * 0.4;
      // Too small a pupil keeps no catchlight: it would read as a notch.
      var glint = open > 0.6 && radius >= 3 ? Math.max(radius * 0.22, 0.75) : 0;
      for (var r = Math.floor(py - radius); r <= Math.ceil(py + radius); r++) {
        for (var c = Math.floor(px - radius); c <= Math.ceil(px + radius); c++) {
          var ax = (c + 0.5 - px) / radius;
          var ay = (r + 0.5 - py) / ry;
          if (ax * ax + ay * ay > 1) continue;
          var gx = c + 0.5 - glintX;
          var gy = r + 0.5 - glintY;
          if (gx * gx + gy * gy < glint * glint) continue;
          ctx.fillRect(Math.round((p.ox + c * cell) * dpr), Math.round((p.oy + r * cell) * dpr), full, full);
        }
      }
    });
  };

  var follow = function (well, state) {
    var look = state.look = { x: 0, y: 0, tx: 0, ty: 0 };
    state.blink = 1;          /* the eyes open once the portrait has assembled */
    var blinkFrom = 0;
    var last = 0;
    var queued = 0;

    var live = function () {
      return state.print && state.phase === "done";
    };
    var onScreen = function () {
      var box = well.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight && box.width > 0;
    };

    var frame = function (now) {
      queued = 0;
      if (!live()) return;
      var dt = last ? Math.min(now - last, 100) : 16.7;
      last = now;
      var ease = 1 - Math.pow(1 - LOOK_EASE, dt / 16.7);
      look.x += (look.tx - look.x) * ease;
      look.y += (look.ty - look.y) * ease;
      var settled = Math.abs(look.tx - look.x) < 0.002 && Math.abs(look.ty - look.y) < 0.002;
      if (settled) {
        look.x = look.tx;
        look.y = look.ty;
      }
      if (blinkFrom) {
        var t = (now - blinkFrom) / BLINK_MS;
        if (t >= 1) {
          state.blink = 0;
          blinkFrom = 0;
        } else {
          state.blink = state.blinkOpening ? 1 - t : 1 - Math.abs(1 - 2 * t);
        }
      }
      drawLook(state);
      if (!settled || blinkFrom) queue();
      else last = 0;
    };
    var queue = function () {
      if (!queued) queued = requestAnimationFrame(frame);
    };

    var blink = function (opening) {
      if (!LOOK_EYES || blinkFrom || !live()) return;
      state.blinkOpening = opening;
      blinkFrom = performance.now();
      queue();
    };
    var blinkLater = function () {
      setTimeout(function () {
        if (!document.hidden && onScreen()) blink(false);
        blinkLater();
      }, 2500 + Math.random() * 4500);
    };

    // Called whenever the print is drawn afresh: on assembly and on resize.
    state.redraw = function () {
      if (!live()) return;
      if (state.blink === 1 && !blinkFrom) blink(true);
      drawLook(state);
    };

    var aim = function (x, y) {
      var p = state.print;
      if (!p) return;
      var box = well.getBoundingClientRect();
      // From between the eyes.
      var ex = box.left + p.imgX + (LENSES[0].cx + LENSES[1].cx) / 2 * p.imgScale;
      var ey = box.top + p.imgY + LENSES[0].cy * p.imgScale;
      var dx = x - ex;
      var dy = y - ey;
      var k = 1 / (Math.sqrt(dx * dx + dy * dy) + LOOK_REACH);
      look.tx = dx * k;
      look.ty = dy * k;
      if (live() && onScreen()) queue();
    };

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" || e.pointerType === "pen") aim(e.clientX, e.clientY);
    }, { passive: true });
    // The pointer has left the window: look back out of the page.
    document.documentElement.addEventListener("pointerleave", function () {
      look.tx = 0;
      look.ty = 0;
      if (live()) queue();
    });
    if (LOOK_EYES) blinkLater();
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
      if (state.redraw) state.redraw();
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
      if (inkOnly && finePointer && !reduceMotion) follow(well, state);
    });
  }
})();
