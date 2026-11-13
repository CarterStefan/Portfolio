/* ==========================================================================
   STEFAN CARTER - PORTFOLIO INTERACTIONS
   1. Scroll-reveal via IntersectionObserver (respects reduced motion)
   2. Footer: current year
   3. Contact form: fetch submit with an inline status message
   4. Self-scrolling captures: a real pause control, not hover-only
   5. Engraved prints: project thumbnails and the portrait
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

  /* --- 5. Engraved prints --------------------------------------------------------
     Each project on an index page prints one object as a line engraving, from
     its well's data-object (assets/img/objects), by js/engrave.js, which also
     holds the tunables. The portrait is printed from its own image, read the
     way its own object-fit and object-position crop it, and it leaves its
     white unprinted: the section colour of its cell is the paper.

     The print is drawn at the screen's own pixel density, up to 2x, and is
     redrawn whenever its well changes size. Hovering or focusing a project
     row hides its print and the real image shows through (styles.css,
     section 21). Without script, or if a browser will not let the canvas be
     read back, the images are simply the images.

     Once printed, the portrait follows the pointer about the page: the face
     turns toward it, and (with LOOK_EYES) a pair of eyes behind the glasses
     watches it. */
  var Engrave = window.Engrave;
  var ASSEMBLE_MS = 650;       /* one length of line's pull into place */
  var ASSEMBLE_STAGGER = 250;  /* the spread of start times across the lines */
  var LOOK_TURN = 0.3;        /* how far the face turns, as a share of the head's radius */
  var LOOK_PITCH = 0.6;        /* nodding is stiffer than turning: a share of the turn */
  var LOOK_REACH = 360;        /* CSS px from the face at which the look is half its full */
  var LOOK_EASE = 0.14;        /* share of the remaining turn made in each 60th of a second */
  var LOOK_EYES = false;       /* pupils behind the glasses that watch, and blink */
  var BLINK_MS = 170;          /* one blink, closed and open again */

  /* The portrait in its own pixels (assets/img/stefan/portrait.webp, 692 by
     947): the head, and the inside of each lens of the glasses. */
  var FACE = Engrave ? Engrave.head : null;
  var LENSES = [
    { cx: 217, cy: 445, rx: 93, ry: 64 },
    { cx: 487, cy: 445, rx: 93, ry: 64 }
  ];

  /* Have a print cut, framed exactly as the image itself would be framed,
     and hand it to done. Nothing is drawn here (see drawPrint). Calls done
     with null if the image cannot be read; does not call it at all until the
     image has a size. */
  var layoutPrint = function (img, canvas, inkOnly, isObject, done) {
    var well = canvas.parentNode;
    var w = well.clientWidth;
    var h = well.clientHeight;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;
    if (!w || !h || !iw || !ih) return;

    // Cover or contain, from its object-position.
    var style = getComputedStyle(img);
    var focus = style.objectPosition.split(" ").map(function (v) {
      return /%$/.test(v) ? parseFloat(v) / 100 : 0.5;
    });
    var scale = (style.objectFit === "contain" ? Math.min : Math.max)(w / iw, h / ih);
    var imgX = (w - iw * scale) * focus[0];
    var imgY = (h - ih * scale) * focus[1];
    // A project's object is not the image in the page, and sits centred.
    if (isObject) {
      var spot = Engrave.place(img, w, h);
      scale = spot.w / iw;
      imgX = spot.x;
      imgY = spot.y;
    }

    var dpr = Math.min(window.devicePixelRatio || 1, Engrave.config.maxDPR);
    Engrave.print(function (ctx) {
      ctx.drawImage(img, imgX, imgY, iw * scale, ih * scale);
    }, w, h, {
      pr: dpr,
      relief: isObject,
      spacing: inkOnly && FINE ? FINE_SPACING : 0,
      fine: inkOnly && FINE ? FINE_WEIGHT : 0,
      reverse: inkOnly || isObject ? false : "auto",
      head: inkOnly ? {
        cx: imgX + FACE.cx * scale,
        cy: imgY + FACE.cy * scale,
        rx: FACE.rx * scale,
        ry: FACE.ry * scale
      } : null
    }, function (p) {
      if (!p) {
        done(null);
        return;
      }
      p.canvas = canvas;
      p.pw = Math.round(w * dpr);
      p.ph = Math.round(h * dpr);
      p.colours = p.reversed ?
        { ink: Engrave.config.paper, ground: Engrave.config.ink } :
        { ink: Engrave.config.ink, ground: inkOnly ? null : Engrave.config.paper };
      // Where the picture itself lies in the well, in CSS px.
      p.imgX = imgX;
      p.imgY = imgY;
      p.imgScale = scale;
      p.shown = false;
      p.flying = false;
      done(p);
    });
  };

  /* Halftone trial (styles.css section 25). A project prints its real image,
     the capture or its placeholder, as a screen of round dots instead of
     an engraved object. The screen sits at 45 degrees like a printed one,
     each dot's area is its cell's share of ink, and dark tones grow the
     dots until they run together. A mostly dark capture prints paper dots
     on ink, so its flat areas stay clean ground. HALFTONE_FUZZ softens
     every dot's edge a little, like ink taken up by the paper.
     html.prints-engraved turns the trial off. */
  /* The portrait is engraved in fine line: hairlines that match the grid's
     1px rules, closer together, with no solid shadows. */
  var FINE = true;
  var FINE_SPACING = 2.6;      /* CSS px between lines */
  var FINE_WEIGHT = 1.1;       /* CSS px, the heaviest line */

  var HALFTONE = !document.documentElement.classList.contains("prints-engraved");
  var HALFTONE_PITCH = 3;      /* CSS px from one dot to the next */
  var HALFTONE_ANGLE = 45;     /* degrees the screen is turned */
  var HALFTONE_FUZZ = 0.2;     /* CSS px of blur on each dot's edge */
  var HALFTONE_GROW = 0.72;    /* a full dot's radius, as a share of the pitch */
  var HALFTONE_SHARPEN = 0.8;  /* how far each dot's tone is pushed from its surroundings */

  var layoutHalftone = function (img, canvas, inkOnly, done) {
    var well = canvas.parentNode;
    var w = well.clientWidth;
    var h = well.clientHeight;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;
    if (!w || !h || !iw || !ih) return;

    var style = getComputedStyle(img);
    var focus = style.objectPosition.split(" ").map(function (v) {
      return /%$/.test(v) ? parseFloat(v) / 100 : 0.5;
    });
    var scale = (style.objectFit === "contain" ? Math.min : Math.max)(w / iw, h / ih);

    // One sample per CSS pixel, framed as the image itself is framed.
    var sample = document.createElement("canvas");
    sample.width = w;
    sample.height = h;
    var sctx = sample.getContext("2d", { willReadFrequently: true });
    sctx.fillStyle = "#fff";
    sctx.fillRect(0, 0, w, h);
    sctx.drawImage(img, (w - iw * scale) * focus[0], (h - ih * scale) * focus[1], iw * scale, ih * scale);
    var px;
    try {
      px = sctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      done(null);
      return;
    }

    // A summed area table of lightness, so any box averages in four reads.
    var W1 = w + 1;
    var sat = new Float64Array(W1 * (h + 1));
    var mean = 0;
    for (var y = 0; y < h; y++) {
      var row = 0;
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        row += l;
        mean += l;
        sat[(y + 1) * W1 + x + 1] = sat[y * W1 + x + 1] + row;
      }
    }
    mean /= w * h;
    // The portrait is ink on white and always prints ink on its cell.
    var reversed = !inkOnly && mean < 0.5;
    var boxLight = function (cx, cy, half) {
      var x0 = Math.max(0, Math.floor(cx - half));
      var y0 = Math.max(0, Math.floor(cy - half));
      var x1 = Math.min(w, Math.ceil(cx + half));
      var y1 = Math.min(h, Math.ceil(cy + half));
      var n = (x1 - x0) * (y1 - y0);
      if (n <= 0) return 1;
      return (sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0]) / n;
    };

    // Every point of the turned screen that lands on the well.
    var pitch = HALFTONE_PITCH;
    var a = HALFTONE_ANGLE * Math.PI / 180;
    var cos = Math.cos(a);
    var sin = Math.sin(a);
    var cx = w / 2;
    var cy = h / 2;
    var reach = Math.ceil(Math.hypot(w, h) / 2 / pitch) + 1;
    var xs = [];
    var ys = [];
    var tones = [];
    for (var v = -reach; v <= reach; v++) {
      for (var u = -reach; u <= reach; u++) {
        var dx = cx + (u * cos - v * sin) * pitch;
        var dy = cy + (u * sin + v * cos) * pitch;
        if (dx < -pitch || dy < -pitch || dx > w + pitch || dy > h + pitch) continue;
        // Sharpened against a wider box, so edges and small type hold up
        // at a fine screen instead of melting into their surroundings.
        var light = boxLight(dx, dy, pitch / 2);
        light += HALFTONE_SHARPEN * (light - boxLight(dx, dy, pitch * 2));
        light = Math.min(1, Math.max(0, light));
        xs.push(dx);
        ys.push(dy);
        tones.push(reversed ? light : 1 - light);
      }
    }

    // Stretch to the full range, so a pale placeholder still prints from
    // clean ground to dots that close up.
    var sorted = tones.slice().sort(function (p, q) { return p - q; });
    var lo = sorted[Math.floor(sorted.length * 0.01)];
    var hi = sorted[Math.floor(sorted.length * 0.995)];
    var range = Math.max(hi - lo, 0.05);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var dotX = [];
    var dotY = [];
    var dotR = [];
    for (var k = 0; k < tones.length; k++) {
      var ink = Math.min(1, Math.max(0, ((tones[k] - lo) / range - 0.03) / 0.97));
      if (ink <= 0) continue;
      var r = HALFTONE_GROW * pitch * Math.sqrt(ink) * dpr;
      if (r < 0.35) continue;
      dotX.push(xs[k] * dpr);
      dotY.push(ys[k] * dpr);
      dotR.push(r);
    }

    var n = dotR.length;
    var wait = new Float32Array(n);
    for (var j = 0; j < n; j++) wait[j] = Math.random();
    done({
      dots: true,
      canvas: canvas,
      pw: Math.round(w * dpr),
      ph: Math.round(h * dpr),
      dpr: dpr,
      n: n,
      x: Float32Array.from(dotX),
      y: Float32Array.from(dotY),
      r: Float32Array.from(dotR),
      wait: wait,
      grow: 1,
      colours: reversed ?
        { ink: Engrave.config.paper, ground: Engrave.config.ink } :
        { ink: Engrave.config.ink, ground: inkOnly ? null : Engrave.config.paper },
      shown: false
    });
  };

  var drawDots = function (p) {
    var ctx = p.ctx;
    ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    if (p.colours.ground) {
      ctx.fillStyle = p.colours.ground;
      ctx.fillRect(0, 0, p.canvas.width, p.canvas.height);
    }
    if (!p.shown) return;
    ctx.fillStyle = p.colours.ink;
    if (HALFTONE_FUZZ) ctx.filter = "blur(" + (HALFTONE_FUZZ * p.dpr).toFixed(2) + "px)";
    ctx.beginPath();
    for (var i = 0; i < p.n; i++) {
      var r = p.r[i] * p.grow;
      if (p.grow < 1) {
        // Each dot swells in its own time while the screen comes up.
        var t = Math.min(1, Math.max(0, (p.grow * 1.6 - p.wait[i] * 0.6)));
        r = p.r[i] * (1 - (1 - t) * (1 - t));
      }
      if (r < 0.2) continue;
      ctx.moveTo(p.x[i] + r, p.y[i]);
      ctx.arc(p.x[i], p.y[i], r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.filter = "none";
  };

  /* Draw a print as it stands: bare, or (once it is shown) every line, at
     home or wherever its flight has it. */
  var drawPrint = function (p) {
    if (p.dots) {
      drawDots(p);
      return;
    }
    var ctx = p.ctx;
    if (p.shown) {
      Engrave.draw(ctx, p, p.colours, p.flying);
      return;
    }
    ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    if (p.colours.ground) {
      ctx.fillStyle = p.colours.ground;
      ctx.fillRect(0, 0, p.canvas.width, p.canvas.height);
    }
  };

  /* The entrance, once per image as it first comes into view. Every length of
     line starts thrown outward from the picture's centre by a random amount,
     some of them off the canvas altogether, and is pulled home like a
     filing to a magnet: slowly at first, then harder as it closes, landing
     with a snap. Lines only ever move by whole spacings, so the motion
     steps like the rest of the site rather than gliding. */
  var assemble = function (state) {
    var p = state.print;
    if (p.dots) {
      // The screen comes up as its dots swell into place.
      p.shown = true;
      p.grow = 0;
      state.phase = "assembling";
      var begin = 0;
      var swell = function (now) {
        if (state.print !== p) return;
        if (!begin) begin = now;
        p.grow = Math.min(1, (now - begin) / ASSEMBLE_MS);
        drawDots(p);
        if (p.grow < 1) requestAnimationFrame(swell);
        else state.phase = "done";
      };
      requestAnimationFrame(swell);
      return;
    }
    Engrave.scatter(p, Math.random, 0.3, 1.2, 5, ASSEMBLE_STAGGER);
    p.shown = true;
    p.flying = true;
    state.phase = "assembling";

    var start = 0;
    var frame = function (now) {
      // Laid out again mid-flight (a resize): the new layout drew itself whole.
      if (state.print !== p) return;
      if (!start) start = now;
      var moving = Engrave.settle(p, now - start, ASSEMBLE_MS);
      p.flying = moving;
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
     Each pixel of the head prints the pixel of the finished engraving that the
     turn brings to it, so the lines bend around the form, as an engraver's
     do, and no gaps open between them.

     With LOOK_EYES, a pupil behind each lens looks further than the head
     turns, and now and then blinks. */
  var drawLook = function (state) {
    var p = state.print;
    var look = state.look;
    var ctx = p.ctx;
    var pr = p.pr;
    var scale = p.imgScale;
    var hcx = p.imgX + FACE.cx * scale;
    var hcy = p.imgY + FACE.cy * scale;
    var hrx = FACE.rx * scale;
    var hry = FACE.ry * scale;
    var W = p.canvas.width;
    var H = p.canvas.height;

    // The engraving, and how far each pixel of the head stands out, worked
    // out once a print.
    if (!p.warp) {
      var bx = Math.max(0, Math.floor((hcx - hrx) * pr));
      var by = Math.max(0, Math.floor((hcy - hry) * pr));
      var bw = Math.min(W, Math.ceil((hcx + hrx) * pr)) - bx;
      var bh = Math.min(H, Math.ceil((hcy + hry) * pr)) - by;
      var depth = new Float32Array(bw * bh);
      for (var dy = 0; dy < bh; dy++) {
        var ny = ((by + dy + 0.5) / pr - hcy) / hry;
        for (var dx = 0; dx < bw; dx++) {
          var nx = ((bx + dx + 0.5) / pr - hcx) / hrx;
          var q = 1 - nx * nx - ny * ny;
          depth[dy * bw + dx] = q > 0 ? Math.sqrt(q) : 0;
        }
      }
      var image = ctx.createImageData(W, H);
      var base = Engrave.pixels(p, p.colours, W, H);
      var out = new Uint32Array(image.data.buffer);
      out.set(base);
      p.warp = { x: bx, y: by, w: bw, h: bh, depth: depth, image: image, base: base, out: out };
    }

    var warp = p.warp;
    var turnX = LOOK_TURN * hrx * look.x;
    var turnY = LOOK_TURN * LOOK_PITCH * hry * look.y;
    var shiftX = turnX * pr;
    var shiftY = turnY * pr;
    var src = warp.base;
    var dst = warp.out;
    var dep = warp.depth;
    for (var r = 0, k = 0; r < warp.h; r++) {
      var y = warp.y + r;
      for (var c = 0; c < warp.w; c++, k++) {
        var x = warp.x + c;
        var z = dep[k];
        if (!z) continue;
        var sx = x - ((z * shiftX + 4096.5 | 0) - 4096);
        var sy = y - ((z * shiftY + 4096.5 | 0) - 4096);
        dst[y * W + x] = sx < 0 || sy < 0 || sx >= W || sy >= H ? 0 : src[sy * W + sx];
      }
    }
    ctx.putImageData(warp.image, 0, 0, warp.x, warp.y, warp.w, warp.h);
    if (!LOOK_EYES) return;

    // The pupils: solid discs carried with the face and then turned within
    // their lenses, each with a catchlight left unprinted. Drawn on the
    // canvas, so a frame with them repaints the head first (above).
    var open = 1 - state.blink;
    ctx.fillStyle = p.colours.ink;
    LENSES.forEach(function (lens) {
      var lx = p.imgX + lens.cx * scale;
      var ly = p.imgY + lens.cy * scale;
      var lrx = lens.rx * scale;
      var lry = lens.ry * scale;
      var ax = (lx - hcx) / hrx;
      var ay = (ly - hcy) / hry;
      var ball = Math.sqrt(Math.max(0, 1 - ax * ax - ay * ay));
      var radius = lry * 0.34;
      var px = lx + ball * turnX + look.x * (lrx - radius) * 0.7;
      var py = ly + ball * turnY + look.y * (lry - radius) * 0.55;
      ctx.beginPath();
      ctx.ellipse(px * pr, py * pr, radius * pr, Math.max(radius * open, 0.5) * pr, 0, 0, 2 * Math.PI);
      // Too small a pupil keeps no catchlight: it would read as a notch.
      if (open > 0.6 && radius >= 6) {
        var gx = (px - radius * 0.4) * pr;
        var gy = (py - radius * 0.4) * pr;
        var gr = radius * 0.22 * pr;
        ctx.moveTo(gx + gr, gy);
        ctx.arc(gx, gy, gr, 0, 2 * Math.PI);
      }
      ctx.fill("evenodd");
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

  if (wells.length && Engrave && "ResizeObserver" in window) {
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var states = new WeakMap();

    /* Assemble a print once it is both laid out and in view, and once the
       cell it sits in has landed: on arrival the page's own entrance slides
       every cell in (styles.css, section 20), and lines converging on a
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

    /* A print takes a moment to cut, off the page's own thread. A newer size
       asked for meanwhile wins. */
    var relayout = function (well) {
      var state = states.get(well);
      var asked = state.asked = (state.asked || 0) + 1;
      var cut = state.dots ?
        function (cb) { layoutHalftone(state.img, state.canvas, state.inkOnly, cb); } :
        function (cb) { layoutPrint(state.img, state.canvas, state.inkOnly, state.isObject, cb); };
      cut(function (p) {
        if (asked !== state.asked) return;
        if (!p) {
          // The canvas could not be read back: the image is simply the image.
          state.canvas.remove();
          well.classList.remove("is-printed");
          return;
        }
        state.canvas.width = p.pw;
        state.canvas.height = p.ph;
        p.ctx = state.canvas.getContext("2d");
        state.print = p;
        // Once a print has started to assemble, a new layout shows it whole.
        if (state.phase === "assembling" || state.phase === "done") {
          p.shown = true;
          state.phase = "done";
        }
        drawPrint(p);
        if (state.redraw) state.redraw();
        maybeAssemble(state);
      });
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
      // A transparent print needs the image under it hidden (styles.css), and
      // hidden from the first, rather than flashing until the print is cut.
      well.classList.add("is-printed");

      var inkOnly = well.classList.contains("c-portrait");
      // A project prints its object (data-object) over its real image, which
      // shows through on hover and focus. If the object will not load, the
      // image is simply the image.
      // The portrait stays an engraving, in fine line (FINE_SPACING, FINE_WEIGHT).
      var dots = HALFTONE && !inkOnly;
      var object = dots ? null : well.getAttribute("data-object");
      var source = object ? new Image() : img;
      var state = { img: source, isObject: !!object, dots: dots, canvas: canvas, inkOnly: inkOnly, print: null, inView: !arrive, phase: "waiting" };
      states.set(well, state);

      source.addEventListener("load", function () { relayout(well); });
      if (object) {
        source.addEventListener("error", function () { canvas.remove(); });
        source.src = object;
      }
      reprint.observe(well);
      if (arrive) arrive.observe(well);
      // The turning head reads the engraving, so a halftone portrait holds still.
      if (inkOnly && !dots && finePointer && !reduceMotion) follow(well, state);
    });
  }
})();
