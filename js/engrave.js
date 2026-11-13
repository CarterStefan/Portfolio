/* ==========================================================================
   STEFAN CARTER | ENGRAVING
   The site's one image treatment: a picture reprinted as an engraving in a
   single solid ink, the way an old catalogue reproduced a photograph. Shadows
   print as solid black and shape the picture; through the mid-tones they open
   into swelling parallel lines that bend over the forms; the lights are bare
   paper. js/main.js uses it for the index previews and the portrait,
   js/intro.js for the landing reel.

   1. Tunables
   2. Cutting a print (runs in a worker, or here if there is none)
   3. On the page: reading a picture, sending it to be cut
   4. Printing, and throwing the lines about

   A print is cut once, off the main thread, into a list of inked pixels. Each
   pixel knows which short length of line it belongs to, so in motion the
   lengths fly home one by one, and a frame only copies pixels. Nothing in a
   frame allocates.

   This file is both the page's script and the worker's.
   ========================================================================== */
(function (scope) {
  "use strict";

  /* --- 1. Tunables -------------------------------------------------------------
     Lengths are CSS px at 1x and are scaled for the screen, whose density is
     capped at maxDPR. Tones are shares of full ink, 0 bare paper to 1 solid,
     after each picture's own range has been stretched to fill the scale. */
  var ENGRAVE = {
    /* Ink. The prints' colours are unchanged from the old treatment: black
       ink, and on a mostly dark capture the paper colour used as the ink. */
    ink: "#000",
    paper: "#fff",
    maxDPR: 2,

    /* Line spacing: `across` lines fit the width of a print, within these */
    spacingMin: 4,
    spacingMax: 6,
    across: 80,

    /* The lines' angle, degrees anticlockwise from horizontal */
    angle: 30,

    /* The tone curve, which sets the whole character of the print. Anything
       lighter than paperBelow is bare paper, anything darker than inkAbove
       is solid. Closer together is bolder and more graphic. */
    paperBelow: 0.14,
    inkAbove: 0.72,
    midtones: 1,

    /* The same, for a mostly dark capture printed in paper colour on black,
       whose thin light lines need more help to carry a photograph */
    midtonesReversed: 0.6,

    /* Solid ink, with a clean edge, whatever the lines are doing: where the
       sharp picture is darker than solidFrom, or where it stands darker than
       its surroundings by thinAbove, which is what a rule or small type does.
       Lower thinAbove keeps more fine detail. */
    solidFrom: 0.78,
    thinAbove: 0.18,

    /* How much the tones are smoothed before the lines read them, CSS px.
       More is calmer, with less grain and less fine detail. */
    smooth: 1.5,

    /* Lines bend over forms: how far, in line spacings, between the darkest
       and lightest of the broad shapes, and how broad those shapes are, in
       line spacings. This is what stops them looking machine-ruled. */
    bend: 1.4,
    bendSize: 4,

    /* Hand: how far a line strays, in line spacings */
    wobble: 0.14,

    /* A line thinner than this, in CSS px, is not printed */
    minWeight: 0.3,

    /* The portrait's head, lit from the upper left. form: the most ink its far
       side takes. lit: how much the near side lifts the dark of the beard and
       glasses, so lines show in them. curve: how far, in line spacings, the
       lines wrap round the ball. */
    form: 0.62,
    lit: 0.3,
    curve: 7,

    /* An object: a flat silhouette given form, lit from the upper left, so it
       prints as a solid thing rather than a logo. body: its ink away from any
       edge. light: how strongly the lit edges open up into lines. fall: how
       much darker its lower right is than its upper left. fine and broad: the
       two sizes of rounding, as shares of its width. rim: the width of the
       solid line round it, CSS px. curve: how far the lines wrap, in spacings.
       fill: how much of its well it takes up. */
    object: { body: 0.74, light: 1.5, fall: 0.3, fine: 0.018, broad: 0.07, rim: 1.5, curve: 5, fill: 0.66 },

    /* The picture is read on a grid this many CSS px a side: finer for a
       small print, which needs it more and costs less */
    detail: 1,
    detailLarge: 2,
    largeFrom: 700,

    /* The length of line that flies as one piece, in spacings */
    pieceLength: 3
  };

  /* On a page, the ink and the paper follow the sheet's own tokens, so a
     print lands on the paper it sits on. Inside the worker there is no page
     and the defaults above stand. Hex only, since shades() reads nothing
     else. */
  if (typeof document !== "undefined") {
    [["ink", "--ink"], ["paper", "--surface"]].forEach(function (pair) {
      var fallback = ENGRAVE[pair[0]];
      Object.defineProperty(ENGRAVE, pair[0], {
        enumerable: true,
        get: function () {
          var el = document.body || document.documentElement;
          var v = getComputedStyle(el).getPropertyValue(pair[1]).trim();
          return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
        }
      });
    });
  }

  /* The head within assets/img/stefan/portrait.webp, in that image's pixels */
  var HEAD = { cx: 345, cy: 473, rx: 279, ry: 407 };

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  /* --- 2. Cutting a print ------------------------------------------------------- */

  /* Stretch to the full range, from the 2nd to the 98th percentile, so a
     low-contrast picture still prints from clean paper to full ink. Only the
     bottom few percent clips to paper, so flat areas print flat. */
  function stretch(tone) {
    var bins = new Uint32Array(1024);
    var n = tone.length;
    var i;
    for (i = 0; i < n; i++) bins[Math.min(1023, tone[i] * 1024 | 0)]++;
    var lo = -1;
    var hi = 1;
    var seen = 0;
    for (i = 0; i < 1024; i++) {
      seen += bins[i];
      if (lo < 0 && seen >= n * 0.02) lo = i / 1024;
      if (seen >= n * 0.98) {
        hi = (i + 1) / 1024;
        break;
      }
    }
    var range = Math.max(hi - lo, 0.05);
    for (i = 0; i < n; i++) tone[i] = clamp01(((tone[i] - lo) / range - 0.04) / 0.96);
  }

  /* A box blur, as a new grid */
  function boxBlur(tone, cols, rows, radius) {
    var mid = new Float32Array(tone.length);
    var out = new Float32Array(tone.length);
    var c, r, sum, width;
    for (r = 0; r < rows; r++) {
      sum = 0;
      width = 0;
      for (c = -radius; c < cols; c++) {
        if (c + radius < cols) { sum += tone[r * cols + c + radius]; width++; }
        if (c - radius - 1 >= 0) { sum -= tone[r * cols + c - radius - 1]; width--; }
        if (c >= 0) mid[r * cols + c] = sum / width;
      }
    }
    for (c = 0; c < cols; c++) {
      sum = 0;
      width = 0;
      for (r = -radius; r < rows; r++) {
        if (r + radius < rows) { sum += mid[(r + radius) * cols + c]; width++; }
        if (r - radius - 1 >= 0) { sum -= mid[(r - radius - 1) * cols + c]; width--; }
        if (r >= 0) out[r * cols + c] = sum / width;
      }
    }
    return out;
  }

  /* Read a grid at a point given in grid squares, blending its neighbours, so
     lines and edges stay smooth at any screen density */
  function sample(grid, cols, rows, gx, gy) {
    if (gx < 0) gx = 0;
    if (gy < 0) gy = 0;
    var c = gx | 0;
    var r = gy | 0;
    var fx = gx - c;
    var fy = gy - r;
    var c1 = c + 1 < cols ? c + 1 : c;
    var r1 = r + 1 < rows ? r + 1 : r;
    if (c >= cols) c = c1 = cols - 1;
    if (r >= rows) r = r1 = rows - 1;
    var top = grid[r * cols + c] * (1 - fx) + grid[r * cols + c1] * fx;
    var low = grid[r1 * cols + c] * (1 - fx) + grid[r1 * cols + c1] * fx;
    return top * (1 - fy) + low * fy;
  }

  /* The head as a ball lit from the upper left: its far side takes shade, its
     near side lifts the darks, and the lines bend round it. head is in CSS px. */
  function model(tone, sharp, shape, cols, rows, cx, cy, head) {
    var E = ENGRAVE;
    var LX = -0.5, LY = -0.62, LZ = 0.6;
    for (var r = 0; r < rows; r++) {
      var ny = ((r + 0.5) * cy - head.cy) / head.ry;
      for (var c = 0; c < cols; c++) {
        var nx = ((c + 0.5) * cx - head.cx) / head.rx;
        var q = 1 - nx * nx - ny * ny;
        if (q <= 0) continue;
        var i = r * cols + c;
        var z = Math.sqrt(q);
        var away = 1 - clamp01(nx * LX + ny * LY + z * LZ);
        var lift = 1 - E.lit * (1 - away);
        var shade = E.form * away * away;
        var lifted = tone[i] * lift;
        tone[i] = lifted > shade ? lifted : shade;
        sharp[i] *= lift;
        shape[i] += E.curve * (nx * nx + ny * ny);
      }
    }
  }

  /* From the picture's lightness to a finished print: a list of inked pixels,
     each with its coverage and the piece of line it belongs to.

     Every pixel asks how far it is from the middle of its line, and how wide
     the tone there makes that line. A line as wide as its spacing has merged
     with its neighbours, which is how the shadows close up into solid ink, and
     one that thins out simply stops. */
  function cutPrint(job) {
    var E = ENGRAVE;
    var sharp = job.light;
    var cols = job.cols;
    var rows = job.rows;
    var cx = job.w / cols;
    var cy = job.h / rows;
    var pr = job.pr;
    var i;
    for (i = 0; i < sharp.length; i++) sharp[i] = job.reversed ? sharp[i] : 1 - sharp[i];
    stretch(sharp);

    var plateW = Math.ceil(job.w * pr);
    var plateH = Math.ceil(job.h * pr);
    var plate = new Uint8Array(plateW * plateH);
    var a = -E.angle * Math.PI / 180;   /* the screen's y runs down */
    var dx = Math.cos(a);
    var dy = Math.sin(a);
    var band = job.spacing * pr;
    var x, y, gx, gy, k;

    var tone, shape, solids;
    if (job.relief) {
      var O = E.object;
      var fineR = Math.max(1, Math.round(job.w * O.fine / job.detail));
      var hFine = boxBlur(sharp, cols, rows, fineR);
      var hBroad = boxBlur(sharp, cols, rows, Math.max(2, Math.round(job.w * O.broad / job.detail)));
      var rimBlur = boxBlur(sharp, cols, rows, Math.max(1, Math.round(O.rim / job.detail)));
      var height = new Float32Array(sharp.length);
      for (i = 0; i < height.length; i++) height[i] = 0.6 * hFine[i] + 0.4 * hBroad[i];
      tone = new Float32Array(sharp.length);
      shape = new Float32Array(sharp.length);
      solids = new Float32Array(sharp.length);
      var LX = -0.62, LY = -0.78;
      for (var rr = 0; rr < rows; rr++) {
        for (var cc = 0; cc < cols; cc++) {
          i = rr * cols + cc;
          var inside = sharp[i];
          shape[i] = O.curve * height[i];
          if (inside < 0.02) continue;
          var left = cc ? height[i - 1] : height[i];
          var right = cc < cols - 1 ? height[i + 1] : height[i];
          var up = rr ? height[i - cols] : height[i];
          var down = rr < rows - 1 ? height[i + cols] : height[i];
          /* The slope, scaled so the rounding's size does not change its strength */
          var facing = -((right - left) * LX + (down - up) * LY) * fineR;
          var across = (cc / cols + rr / rows - 1) * O.fall;
          tone[i] = inside * clamp01(O.body - facing * O.light + across);
          /* A solid line where the silhouette meets the paper */
          solids[i] = inside > 0.5 && rimBlur[i] < 0.9 ? 1 : 0;
        }
      }
    }

    if (job.plain) {
      /* Type set large is simply solid */
      for (y = 0, k = 0; y < plateH; y++) {
        gy = (y + 0.5) / pr / cy - 0.5;
        for (x = 0; x < plateW; x++, k++) {
          gx = (x + 0.5) / pr / cx - 0.5;
          plate[k] = clamp01((sample(sharp, cols, rows, gx, gy) - 0.45) * 8) * 255;
        }
      }
    } else {
      if (!job.relief) {
      /* The lines read only broad tone. A rule or small type is solid ink
         (below), and lines crossing it would only grow thorns, so each square
         is held down to little more than its surroundings. */
      var range = Math.max(E.inkAbove - E.paperBelow, 0.01);
      var power = job.reversed ? E.midtonesReversed : E.midtones;
      var near = boxBlur(sharp, cols, rows, Math.max(1, Math.round(job.spacing * 2 / job.detail)));
      tone = new Float32Array(sharp.length);
      for (i = 0; i < tone.length; i++) {
        var held = near[i] + E.thinAbove * 0.3;
        tone[i] = Math.pow(clamp01(((sharp[i] < held ? sharp[i] : held) - E.paperBelow) / range), power);
      }
      tone = boxBlur(tone, cols, rows, Math.max(1, Math.round(E.smooth / job.detail)));
      shape = boxBlur(tone, cols, rows, Math.max(1, Math.round(job.spacing * E.bendSize / job.detail)));
      for (i = 0; i < shape.length; i++) shape[i] *= E.bend;
      if (job.head) model(tone, sharp, shape, cols, rows, cx, cy, job.head);

      /* Where it prints solid, decided once the head has had its light */
      var around = boxBlur(sharp, cols, rows, Math.max(1, Math.round(job.spacing * 2 / job.detail)));
      solids = new Float32Array(sharp.length);
      for (i = 0; i < solids.length; i++) {
        // A fine print keeps solid ink only for thin features, so the
        // shadows stay in line rather than closing up.
        var broad = job.fine ? -1 : (sharp[i] - E.solidFrom) * 12;
        var thin = (sharp[i] - around[i] - E.thinAbove) * 10;
        solids[i] = clamp01(broad > thin ? broad : thin);
      }
      }

      var spacing = job.spacing;
      var nx = -dy;
      var ny = dx;
      var wob = E.wobble;
      var minHalf = (job.fine ? 0.15 : E.minWeight) * pr / 2;
      // A fine print's heaviest line is a hairline like the grid's rules.
      var fullHalf = job.fine ? job.fine * pr / 2 : band * 0.5;
      for (y = 0, k = 0; y < plateH; y++) {
        var py = (y + 0.5) / pr;
        gy = py / cy - 0.5;
        for (x = 0; x < plateW; x++, k++) {
          var px = (x + 0.5) / pr;
          gx = px / cx - 0.5;
          var solid = sample(solids, cols, rows, gx, gy);
          var t = sample(tone, cols, rows, gx, gy);
          var cover = solid;
          if (t > 0 && solid < 1) {
            var phase = (nx * px + ny * py) / spacing + sample(shape, cols, rows, gx, gy) +
              wob * (Math.sin(px * 0.031 + py * 0.017) + 0.5 * Math.sin(px * 0.011 - py * 0.053));
            var dist = Math.abs(phase - Math.floor(phase) - 0.5) * band;
            var half = t * fullHalf;
            if (half >= minHalf) {
              var line = half - dist + 0.5;
              if (line > cover) cover = line > 1 ? 1 : line;
            }
          }
          plate[k] = cover * 255;
        }
      }
    }

    /* Gather the inked pixels. A piece is a length of one band along the
       lines, so what flies is a stroke rather than a square. */
    var count = 0;
    for (i = 0; i < plate.length; i++) if (plate[i]) count++;
    var xs = new Uint16Array(count);
    var ys = new Uint16Array(count);
    var coverage = new Uint8Array(count);
    var piece = new Uint32Array(count);

    var length = band * E.pieceLength;
    var diag = plateW + plateH;
    var bands = Math.ceil(2 * diag / band) + 2;
    var lengths = Math.ceil(2 * diag / length) + 2;
    var ids = new Int32Array(bands * lengths).fill(-1);
    var homesX = [];
    var homesY = [];
    var n = 0;
    for (y = 0; y < plateH; y++) {
      for (x = 0; x < plateW; x++) {
        var value = plate[y * plateW + x];
        if (!value) continue;
        var key = (Math.floor((-dy * x + dx * y + diag) / band)) * lengths + Math.floor((dx * x + dy * y + diag) / length);
        var id = ids[key];
        if (id < 0) {
          id = ids[key] = homesX.length;
          homesX.push(x + job.originX);
          homesY.push(y + job.originY);
        }
        xs[n] = x + job.originX;
        ys[n] = y + job.originY;
        coverage[n] = value;
        piece[n] = id;
        n++;
      }
    }
    return {
      id: job.id,
      count: count,
      xs: xs,
      ys: ys,
      cover: coverage,
      piece: piece,
      homeX: Float32Array.from(homesX),
      homeY: Float32Array.from(homesY)
    };
  }

  /* In a worker, this is all that happens */
  if (typeof document === "undefined") {
    scope.onmessage = function (e) {
      var out = cutPrint(e.data);
      scope.postMessage(out, [out.xs.buffer, out.ys.buffer, out.cover.buffer, out.piece.buffer, out.homeX.buffer, out.homeY.buffer]);
    };
    return;
  }

  /* --- 3. On the page ----------------------------------------------------------- */
  var scriptSrc = document.currentScript && document.currentScript.src;
  var worker = null;
  var workerFailed = false;
  var waiting = new Map();
  var nextId = 1;

  function send(job, done) {
    if (!worker && !workerFailed) {
      try {
        worker = new Worker(scriptSrc);
        worker.onmessage = function (e) {
          var entry = waiting.get(e.data.id);
          waiting.delete(e.data.id);
          if (entry) entry.done(e.data);
        };
        /* No worker after all: cut whatever was waiting here instead */
        worker.onerror = function () {
          workerFailed = true;
          worker = null;
          var stuck = Array.from(waiting.values());
          waiting.clear();
          stuck.forEach(function (entry) { entry.done(cutPrint(entry.job)); });
        };
      } catch (e) {
        workerFailed = true;
        worker = null;
      }
    }
    if (!worker) {
      done(cutPrint(job));
      return;
    }
    job.id = nextId++;
    waiting.set(job.id, { job: job, done: done });
    worker.postMessage(job);
  }

  function spacingFor(w) {
    return Math.min(ENGRAVE.spacingMax, Math.max(ENGRAVE.spacingMin, w / ENGRAVE.across));
  }

  /* The picture is painted onto a canvas of one pixel per grid square, so the
     browser's own scaler does the averaging. Returns null if the canvas cannot
     be read back. */
  function read(paint, w, h, detail) {
    var cols = Math.max(1, Math.ceil(w / detail));
    var rows = Math.max(1, Math.ceil(h / detail));
    var sample = document.createElement("canvas");
    sample.width = cols;
    sample.height = rows;
    var ctx = sample.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cols, rows);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.setTransform(cols / w, 0, 0, rows / h, 0, 0);
    paint(ctx);
    var px;
    try {
      px = ctx.getImageData(0, 0, cols, rows).data;
    } catch (e) {
      return null;
    }
    var light = new Float32Array(cols * rows);
    var mean = 0;
    for (var i = 0; i < light.length; i++) {
      light[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      mean += light[i];
    }
    return { light: light, mean: mean / light.length, cols: cols, rows: rows };
  }

  /* Read a picture and have its print cut.
       paint(ctx)    draws the picture, in CSS px across w by h
       opts.pr       device pixels to a CSS pixel (capped at maxDPR)
       opts.reverse  true: the ink is the picture's light. "auto": whichever
                     tone is in the minority. Otherwise the ink is its dark.
       opts.spacing  line spacing, CSS px (default: from the width)
       opts.head     {cx, cy, rx, ry} in CSS px: model this as the head
       opts.plain    true: type set large, with no shading or fine work
       opts.relief   true: a flat object's silhouette, to be given form
       opts.fine     a line weight, CSS px: every line at most this thick,
                     with no solid shadows (a hairline print)
       opts.originX, originY  device px added to everything, for a print
                     that sits inside a larger canvas
     done(print) is called when it is ready, which may be after other work;
     with null if the picture cannot be read. */
  function print(paint, w, h, opts, done) {
    var E = ENGRAVE;
    var detail = w < E.largeFrom ? E.detail : E.detailLarge;
    var seen = read(paint, w, h, detail);
    if (!seen) {
      done(null);
      return;
    }
    var pr = Math.min(opts.pr || 1, E.maxDPR);
    var spacing = opts.spacing || spacingFor(w);
    var reversed = opts.reverse === true || (opts.reverse === "auto" && seen.mean < 0.5);
    send({
      light: seen.light,
      cols: seen.cols,
      rows: seen.rows,
      w: w,
      h: h,
      pr: pr,
      detail: detail,
      spacing: spacing,
      reversed: reversed,
      plain: !!opts.plain,
      relief: !!opts.relief,
      fine: opts.fine || 0,
      head: opts.head || null,
      originX: opts.originX || 0,
      originY: opts.originY || 0
    }, function (cutOut) {
      cutOut.w = w;
      cutOut.h = h;
      cutOut.pr = pr;
      cutOut.reversed = reversed;
      cutOut.step = spacing * pr;
      cutOut.originX = opts.originX || 0;
      cutOut.originY = opts.originY || 0;
      cutOut.pieces = cutOut.homeX.length;
      done(cutOut);
    });
  }

  /* Where an object sits in a w by h box: centred, at the size it is meant to be */
  function place(img, w, h) {
    var iw = img.naturalWidth || 512;
    var ih = img.naturalHeight || 512;
    var s = Math.min(w, h) * ENGRAVE.object.fill / Math.max(iw, ih);
    return { x: (w - iw * s) / 2, y: (h - ih * s) / 2, w: iw * s, h: ih * s };
  }

  /* --- 4. Printing, and throwing the lines about ------------------------------- */

  /* Every piece's distance from home, in whole line spacings, for the moment
     they fly in: near and far scale its distance from the centre, noise adds up
     to that many spacings either way, and spread staggers when each sets off. */
  function scatter(p, rnd, near, far, noise, spread) {
    var n = p.pieces;
    p.fx = new Float32Array(n);
    p.fy = new Float32Array(n);
    p.wait = new Float32Array(n);
    p.dx = new Int32Array(n);
    p.dy = new Int32Array(n);
    var cx = (p.w * p.pr / 2 + p.originX) / p.step;
    var cy = (p.h * p.pr / 2 + p.originY) / p.step;
    for (var i = 0; i < n; i++) {
      var fling = near + rnd() * (far - near);
      p.fx[i] = (p.homeX[i] / p.step - cx) * fling + (rnd() - 0.5) * noise;
      p.fy[i] = (p.homeY[i] / p.step - cy) * fling + (rnd() - 0.5) * noise;
      p.wait[i] = rnd() * spread;
    }
  }

  /* Where every piece stands lt after they set off: pulled home like a filing
     to a magnet, slowly and then with a snap, a whole spacing at a time. Returns
     whether any is still moving. */
  function settle(p, lt, span) {
    var moving = false;
    for (var i = 0; i < p.pieces; i++) {
      var t = clamp01((lt - p.wait[i]) / span);
      var pull = 1 - t * t;
      p.dx[i] = Math.round(Math.round(p.fx[i] * pull) * p.step);
      p.dy[i] = Math.round(Math.round(p.fy[i] * pull) * p.step);
      if (t < 1) moving = true;
    }
    return moving;
  }

  function parseColour(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  /* The 256 pixels a print can hold, from bare ground to full ink. On a ground
     they are mixed with it, so the print comes out opaque; without one, the
     ink's coverage is its alpha and the page shows through. */
  function shades(ink, ground) {
    var lut = new Uint32Array(256);
    var a = parseColour(ink);
    var b = ground ? parseColour(ground) : null;
    for (var i = 0; i < 256; i++) {
      var R, G, B, A;
      if (b) {
        var m = i / 255;
        R = b[0] + (a[0] - b[0]) * m | 0;
        G = b[1] + (a[1] - b[1]) * m | 0;
        B = b[2] + (a[2] - b[2]) * m | 0;
        A = 255;
      } else {
        R = a[0];
        G = a[1];
        B = a[2];
        A = i;
      }
      lut[i] = (A << 24 | B << 16 | G << 8 | R) >>> 0;
    }
    return lut;
  }

  /* A reusable frame for each canvas size in use */
  var frames = [];
  function frameFor(ctx, w, h) {
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].w === w && frames[i].h === h) return frames[i];
    }
    var img = ctx.createImageData(w, h);
    var made = { w: w, h: h, img: img, px: new Uint32Array(img.data.buffer) };
    if (frames.length >= 3) frames.shift();
    frames.push(made);
    return made;
  }

  /* Lay a print's pixels into a buffer, each piece at home or wherever its
     flight has it */
  function lay(out, W, H, p, lut, flying) {
    var xs = p.xs;
    var ys = p.ys;
    var cover = p.cover;
    var piece = p.piece;
    var i, n = p.count;
    out.fill(lut[0]);
    if (!flying) {
      for (i = 0; i < n; i++) out[ys[i] * W + xs[i]] = lut[cover[i]];
      return;
    }
    var dx = p.dx;
    var dy = p.dy;
    for (i = 0; i < n; i++) {
      var k = piece[i];
      var x = xs[i] + dx[k];
      var y = ys[i] + dy[k];
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      out[y * W + x] = lut[cover[i]];
    }
  }

  /* Print onto a canvas. colours is { ink, ground }, ground being optional. */
  function draw(ctx, p, colours, flying) {
    if (p.lutInk !== colours.ink || p.lutGround !== colours.ground) {
      p.lut = shades(colours.ink, colours.ground);
      p.lutInk = colours.ink;
      p.lutGround = colours.ground;
    }
    var W = ctx.canvas.width;
    var H = ctx.canvas.height;
    var f = frameFor(ctx, W, H);
    lay(f.px, W, H, p, p.lut, flying);
    ctx.putImageData(f.img, 0, 0);
  }

  /* A print's finished pixels, for a caller that moves them itself */
  function pixels(p, colours, W, H) {
    var out = new Uint32Array(W * H);
    lay(out, W, H, p, shades(colours.ink, colours.ground), false);
    return out;
  }

  /* Let go of the shared frames, after a reel that needed large ones */
  function release() { frames.length = 0; }

  scope.Engrave = {
    config: ENGRAVE,
    head: HEAD,
    print: print,
    place: place,
    scatter: scatter,
    settle: settle,
    draw: draw,
    pixels: pixels,
    release: release
  };
})(self);
