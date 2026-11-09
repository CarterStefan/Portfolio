/* ==========================================================================
   STEFAN CARTER | LANDING REEL
   Home only. index.html's <head> decides before the first paint whether the
   reel plays (a visitor arriving from outside the site, once a session, not
   for reduced motion), and loads this file only when it will. The look is
   styles.css section 22.

   About fourteen seconds, in four parts. Who: the name prints
   itself from flying lines of engraving, then the camera drops a line to the
   portrait and what I do, five words at a reading pace. The work: the
   camera drops onto a ruled board of the nine projects and flicks along it
   like a print carriage. The board: it pulls back to show all nine, and
   holds. Home: the board peels away in lanes while the page lands behind.

   1. Words and projects
   2. Time
   3. Engraved prints
   4. Building the board
   5. The camera
   6. Drawing a frame
   7. Hand-over, skipping and giving up
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("intro-on") || !window.Engrave) return;
  /* Tells the <head> gate's failsafe that the reel has been taken over */
  root.classList.add("intro-live");

  /* --- 1. Words and projects ---------------------------------------------------
     Who first, in the site's own words: the role from the career path, with
     its Now; the award as the About page gives it; and the practice. Each
     word takes one ink, and the portrait beside it changes ink with it. Its
     hold is how long it stays, which is roughly how long it takes to read.

     Then the nine projects, in the Selected work order, under the name of their
     practice: the title lands once, on the first plate of its section, and
     stands from there as the camera moves along, and on the final board each
     plate changes to its project's own name (title). A project with real captures
     shows one, spanning the plate's width and, where the plate is wider than
     16:10, cropped top and bottom about its focus, the share of its height
     held in view: Bird Watcher's headline sits high, so it keeps its top. A
     project with none shows its engraved object (assets/img/objects), so no
     Instem UI ever appears (PRODUCT.md). */
  var IMG = "/assets/img/";
  var SAY = [
    { lines: ["Senior", "product", "designer"], tag: "Now", ink: "moss", hold: 0.95 },
    { lines: ["Digital Hero", "of the Year"], note: "Nominated finalist, 2026", ink: "amber", hold: 1.3 },
    { lines: ["Web", "design"], ink: "rose", hold: 0.75 },
    { lines: ["Design", "systems"], ink: "slate", hold: 0.75 },
    { lines: ["Design", "engineering"], ink: "moss", hold: 0.8 }
  ];
  var PRODUCT = ["Product", "design"];
  var WEB = ["Web", "design"];
  var PROJECTS = [
    { name: PRODUCT, title: ["Centrus"], object: "centrus" },
    { name: PRODUCT, title: ["Preclinical", "Insights"], object: "preclinical-insights" },
    { name: PRODUCT, title: ["KnowledgeScan"], object: "knowledgescan" },
    { name: PRODUCT, title: ["InstemUX"], object: "instemux" },
    { name: WEB, title: ["Nick", "Hampshire"], shot: "nick-hampshire/" },
    { name: WEB, title: ["No", "Boundaries"], shot: "no-boundaries/" },
    { name: WEB, title: ["Visit", "Stafford"], shot: "visit-stafford/" },
    { name: WEB, title: ["Bird", "Watcher"], shot: "bird-watcher/", focus: 0.2 },
    { name: WEB, title: ["Wrottesley", "Golf Club"], object: "wrottesley-golf" }
  ];
  /* Plate by plate through the four inks of section 21, so the whole board
     reads as a print run of all four, on the diagonal */
  var INKS = ["moss", "amber", "rose", "slate"];

  /* --- 2. Time ---------------------------------------------------------------------
     One clock, in seconds, read 30 times a second. Every frame is a pure
     function of it, which is how a skip can jump straight to any frame. A
     plate's own times are counted from the start of the camera move that
     brings it in, and its words land when that move does. */
  var FPS = 30;

  /* Who. The words change at a reading pace; the work after them flicks. */
  var SWARM_AT = 0.04, SWARM_MS = 0.40, SWARM_SPREAD = 0.12;   /* the name, from lines */
  var FEED_AT = 1.05, FEED = 0.30;      /* down a line, from the name to what I do */
  var ME_MS = 0.40, ME_SPREAD = 0.10;   /* the portrait printing, from FEED_AT */
  var WORD_CHAR = 0.09;                 /* one letter of a word dropping in, or out */
  var WORD_IN = 0.06;                   /* a new word waits this long for the old one to start falling */
  var WORD_MARK_AT = 0.12, WORD_MARK_MS = 0.22;   /* these from a word's start */
  var TAG_AT = 0.30;
  var NOTE_AT = 0.40, NOTE_MS = 0.20;
  var WASH_MS = 0.16;                   /* the portrait's ink rolling up to the next */

  /* The work */
  var INTO = 0.28;      /* down a line, onto the first plate */
  var PAN = 0.16;       /* along a row */
  var RETURN = 0.24;    /* back to the start of the next row */
  var AFTER = 0.51;     /* on a plate, once it has landed: long enough to see the picture */
  var PRINT_MS = 0.14, PRINT_SPREAD = 0.04;   /* a plate's picture, from its start */
  var CHAR_MS = 0.07;                         /* one letter of a name dropping in */
  var DEV_AT = 0.02, DEV_MS = 0.07;           /* a capture developing, from landing */

  /* The board */
  var PULL = 0.40;      /* out to the whole board */
  var HOLD = 1;         /* the whole board, held */
  var CASCADE = 0.04;   /* the rail's index lighting up, number by number, as it holds */

  /* The hand-over, counted from the moment the board starts to leave. It
     glides where the reel steps, and runs at the screen's own rate. Each row
     of plates slides out on the site's original accelerating curve (section
     1's --vt-ease-leave before section 21 stepped it); Home's entrance is
     released just after, on its original settle curve (section 22's
     html.intro-land), so each of its rows follows a row of plates off the
     same edge and the board peels away from a page already landing. The
     rail is the spine throughout: the mark stays where the nav's own sits,
     and the rail only slides away once Home's rails are dropping in above
     it. RAIL_AT is timed against that drop, --vt-lock-at at intro-land's
     pace, and has to move with it. */
  var LANE_GAP = 0.05;   /* between rows of plates */
  var PLATE_GAP = 0.012; /* between plates in a row, the one nearest the exit first:
                            barely apart, since on a curve that keeps speeding up
                            a wider gap opens into holes in the row */
  var LANE_MS = 0.55;
  var HOME_AT = 0.15;    /* Home's entrance released */
  var RAIL_AT = 0.34, RAIL_MS = 0.55;

  var ABOUT_AT = FEED_AT + FEED;
  var beats = [];
  var at = ABOUT_AT;
  SAY.forEach(function (word) {
    beats.push(at);
    at += word.hold;
  });
  var FLICK_AT = at;
  var starts = [];
  var pans = [];
  for (var k = 0; k < PROJECTS.length; k++) {
    var move = !k ? INTO : k % 3 === 0 ? RETURN : PAN;
    starts.push(at);
    pans.push(move);
    at += move + AFTER;
  }
  var PULL_AT = at;
  var HOLD_AT = PULL_AT + PULL;
  var CLEAR_AT = HOLD_AT + HOLD;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function prog(t, from, span) { return clamp01((t - from) / span); }
  /* Steps that land on their last value only at the end, like jump-end... */
  function stepsEnd(n, p) { return p >= 1 ? 1 : Math.floor(p * n) / n; }
  /* ...and steps that jump at once, like jump-start */
  function stepsStart(n, p) { return p <= 0 ? 0 : Math.ceil(p * n) / n; }
  function inOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function inOutQuart(x) { return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }
  /* A CSS cubic-bezier(), solved for x by halving, which stays exact on the
     flat ends where Newton's method stalls */
  function bezier(x1, y1, x2, y2) {
    function at(a, b, t) { return 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0;
      var hi = 1;
      var t = x;
      for (var i = 0; i < 20; i++) {
        t = (lo + hi) / 2;
        if (at(x1, x2, t) < x) lo = t;
        else hi = t;
      }
      return at(y1, y2, t);
    };
  }
  var leave = bezier(0.4, 0, 1, 1);

  /* --- 3. Engraved prints --------------------------------------------------------
     Cut by js/engrave.js, as js/main.js cuts the portrait: the picture's tones
     are stretched to the full range and reprinted as lines in black,
     straight onto the block behind them. Every length of line starts thrown out
     from the picture's centre and is pulled home in whole line spacings,
     slowly and then with a snap. The throw is seeded, so a frame is the same
     however the clock reached it. */
  var Engrave = window.Engrave;
  var INK = { ink: Engrave.config.ink };
  var PR = Math.min(window.devicePixelRatio || 1, Engrave.config.maxDPR);

  function seeded(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Where a 16:10 picture lies across a w by h box: the full width, cropped
     top and bottom about its focus where the box is wider than the picture,
     and centred on the ink where the box is taller (a phone's plate) */
  function fit(w, h, focus) {
    var ph = w / 1.6;
    return { x: 0, y: ph > h ? (h - ph) * (focus == null ? 0.5 : focus) : (h - ph) / 2, w: w, h: ph };
  }

  /* The print as it stands lt seconds after its lines set off, or whole */
  function drawPrint(print, ctx, lt, ms) {
    var whole = lt === Infinity;
    if (!whole) Engrave.settle(print, lt, ms);
    Engrave.draw(ctx, print, INK, !whole);
  }

  /* A print that assembles once, from its own start, and then stands */
  function renderPrint(P, lt, ms, spread) {
    if (!P.print) return;
    if (lt < 0) {
      if (P.shown !== -1) P.ctx.clearRect(0, 0, P.canvas.width, P.canvas.height);
      P.shown = -1;
    } else if (lt < ms + spread) {
      drawPrint(P.print, P.ctx, lt, ms);
      P.shown = 0;
    } else if (P.shown !== 1) {
      drawPrint(P.print, P.ctx, Infinity, ms);
      P.shown = 1;
    }
  }

  /* --- 4. Building the board -----------------------------------------------------
     A column of two plates about me above a ruled board of the nine
     projects, three to a row: the name at (0, -2), what I do at (0, -1),
     then the projects from (0, 0). The board is built once, measured once,
     and only ever moved. */
  var overlay, stage, skipBtn, rail, railName, railSay, board, items, open, about, W, H, sizeW, sizeH;
  var plates = [];
  var queue = [];      /* prints whose picture has arrived but which are not laid out yet */

  function make(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* A box drawn round something, side by side, with a tab at its corner */
  function buildNote(text, parent) {
    var note = { el: make("div", "intro-note"), sides: [], chip: null };
    for (var s = 0; s < 4; s++) note.sides.push(note.el.appendChild(make("span", "intro-side")));
    note.chip = note.el.appendChild(make("span", "intro-chip", text));
    parent.appendChild(note.el);
    return note;
  }

  function buildOpen() {
    var plate = make("div", "intro-plate is-open");
    plate.style.setProperty("--c", 0);
    plate.style.setProperty("--r", -2);
    var grid = make("div", "intro-grid");
    var title = make("p", "intro-open");
    ["Stefan", "Carter"].forEach(function (word, i) {
      if (i) title.appendChild(make("span", "intro-ob", " "));
      var w = make("span", "intro-ow");
      word.split("").forEach(function (ch) { w.appendChild(make("span", "intro-c", ch)); });
      title.appendChild(w);
    });
    var swarm = make("canvas", "intro-swarm");
    grid.appendChild(title);
    plate.appendChild(grid);
    plate.appendChild(swarm);
    return { el: plate, title: title, swarm: swarm, ctx: null, print: null };
  }

  function buildAbout() {
    var plate = make("div", "intro-plate is-about");
    plate.style.setProperty("--c", 0);
    plate.style.setProperty("--r", -1);
    var grid = make("div", "intro-grid");

    /* Every word is set at the one size its longest line allows, so the
       slot keeps still while the words change in it */
    var say = make("div", "intro-say");
    var longest = 0;
    SAY.forEach(function (word) {
      word.lines.forEach(function (line) { longest = Math.max(longest, line.length); });
    });
    say.style.setProperty("--say-chars", longest);
    say.appendChild(make("p", "intro-by", "Stefan Carter"));
    var words = SAY.map(function (word) {
      var el = say.appendChild(make("div", "intro-word"));
      el.style.setProperty("--block", "var(--" + word.ink + "-block)");
      var w = { el: el, chars: [], lines: [], tag: null, note: null };
      if (word.tag) w.tag = el.appendChild(make("span", "intro-tag", word.tag));
      word.lines.forEach(function (line) {
        var l = el.appendChild(make("span", "intro-wl"));
        line.split("").forEach(function (ch) {
          w.chars.push(l.appendChild(make("span", "intro-wc", ch === " " ? "\u00a0" : ch)));
        });
        w.lines.push(l);
      });
      if (word.note) w.note = buildNote(word.note, el);
      return w;
    });

    /* The portrait, printed onto the ink of the word beside it */
    var me = make("div", "intro-me");
    var wash = me.appendChild(make("div", "intro-wash"));
    var canvas = me.appendChild(make("canvas", "intro-print"));

    grid.appendChild(say);
    grid.appendChild(me);
    grid.appendChild(make("span", "intro-rule intro-rule-b"));
    plate.appendChild(grid);
    return {
      el: plate, words: words, me: me, wash: wash, canvas: canvas, ctx: null,
      img: null, failed: false, print: null, shown: null
    };
  }

  function buildPlate(p, k) {
    var plate = make("div", "intro-plate");
    var style = plate.style;
    style.setProperty("--c", k % 3);
    style.setProperty("--r", Math.floor(k / 3));
    style.setProperty("--block", "var(--" + INKS[k % 4] + "-block)");

    var grid = make("div", "intro-grid");

    /* Two titles in one slot, each sized to its own length: the section it
       flicks past under, then the project's own name on the final board */
    var head = make("div", "intro-head");
    function buildTitle(lines, cls) {
      var title = make("p", cls);
      var chars = [];
      title.style.setProperty("--chars", lines.join(" ").length);
      title.style.setProperty("--chars-n", Math.max.apply(null, lines.map(function (l) { return l.length; })));
      title.style.setProperty("--lines-n", lines.length);
      lines.forEach(function (line, i) {
        if (i) title.appendChild(make("span", "intro-sp", " "));
        var tl = make("span", "intro-tl");
        line.split("").forEach(function (ch) {
          var c = make("span", "intro-ch", ch === " " ? "\u00a0" : ch);
          chars.push(c);
          tl.appendChild(c);
        });
        title.appendChild(tl);
      });
      head.appendChild(title);
      return chars;
    }
    var chars = buildTitle(p.name, "intro-title");
    var nameChars = buildTitle(p.title, "intro-title is-name");
    nameChars.forEach(function (c) { show(c, false); });

    var shot = make("div", "intro-shot");
    var canvas = make("canvas", "intro-print");
    shot.appendChild(canvas);

    grid.appendChild(head);
    grid.appendChild(shot);
    grid.appendChild(make("span", "intro-rule intro-rule-a"));
    plate.appendChild(grid);

    return {
      el: plate, p: p, k: k, c: k % 3, r: Math.floor(k / 3),
      chars: chars, nameChars: nameChars, shot: shot, canvas: canvas, ctx: null,
      img: null, failed: false, print: null, shown: null, final: false
    };
  }

  function build() {
    rail = make("div", "intro-rail");
    /* The mark sits apart from the rail, exactly where the nav's own sits,
       so it never moves while the rail comes and goes beneath it */
    var brand = make("div", "intro-brand");
    var logo = brand.appendChild(make("img"));
    logo.src = IMG + "logo.png";
    logo.alt = "";
    logo.width = 32;
    logo.height = 32;
    /* The rail names what is beside it, as on every page: the name, then
       the practice, then an index of the plates */
    railName = rail.appendChild(make("p", "intro-rail-label", "Portfolio"));
    railSay = rail.appendChild(make("p", "intro-rail-label", "Practice"));
    var index = rail.appendChild(make("ol", "intro-index"));
    items = PROJECTS.map(function (p, k) {
      var li = index.appendChild(make("li", null, "0" + (k + 1)));
      li.style.setProperty("--block", "var(--" + INKS[k % 4] + "-block)");
      return li;
    });

    var field = make("div", "intro-field");
    board = field.appendChild(make("div", "intro-board"));
    open = buildOpen();
    about = buildAbout();
    board.appendChild(open.el);
    board.appendChild(about.el);
    PROJECTS.forEach(function (p, k) {
      var plate = buildPlate(p, k);
      plates.push(plate);
      board.appendChild(plate.el);
    });

    stage.appendChild(rail);
    stage.appendChild(field);
    stage.appendChild(brand);
  }

  /* Plates are whole pixels, so at rest the camera sits on whole pixels and
     the type is drawn sharp. */
  function measure() {
    sizeW = overlay.clientWidth;
    sizeH = overlay.clientHeight;
    W = Math.floor(sizeW - rail.getBoundingClientRect().width);
    H = Math.floor(sizeH);
    board.style.setProperty("--pw", W + "px");
    board.style.setProperty("--ph", H + "px");
    var nav = document.querySelector(".cert-nav");
    if (nav) overlay.style.setProperty("--intro-nav", nav.clientHeight + "px");

    function size(P, box) {
      P.w = box.clientWidth;
      P.h = box.clientHeight;
      P.canvas.width = Math.round(P.w * PR);
      P.canvas.height = Math.round(P.h * PR);
      P.ctx = P.canvas.getContext("2d");
    }
    size(about, about.me);
    plates.forEach(function (P) { size(P, P.shot); });
  }

  /* A live site's capture comes at the size it will be seen at: the 1920
     wide hero (which its case study also opens on) for a large picture,
     otherwise the 960 wide index thumbnail. */
  function load(P, src, print) {
    var img = new Image();
    img.decoding = "async";
    img.src = src;
    P.img = img;
    var ready = img.decode ? img.decode() : new Promise(function (resolve, reject) {
      img.onload = resolve;
      img.onerror = reject;
    });
    ready.then(function () {
      queue.push(function () { print(P); });
    }, function () { P.failed = true; });
  }

  /* The prints are cut off this thread, so the reel keeps its frames, and a
     plate whose picture is not back yet stays blank until it is. */
  function printPlate(P) {
    var f = P.p.shot ? fit(P.w, P.h, P.p.focus) : Engrave.place(P.img, P.w, P.h);
    Engrave.print(function (ctx) {
      ctx.drawImage(P.img, f.x, f.y, f.w, f.h);
    }, P.w, P.h, { pr: PR, relief: !P.p.shot }, function (print) {
      if (!print) {
        P.failed = true;
        return;
      }
      Engrave.scatter(print, seeded(7 + P.k * 101), 0.3, 1.2, 8, PRINT_SPREAD);
      P.print = print;
      P.shown = null;
    });
  }

  /* The whole head, set in from the edges of its cell, as the About page
     sets it */
  function printMe(A) {
    var iw = A.img.naturalWidth || 692;
    var ih = A.img.naturalHeight || 947;
    var inset = Math.round(Math.min(A.w, A.h) * 0.07);
    var s = Math.min((A.w - 2 * inset) / iw, (A.h - 2 * inset) / ih);
    var x = (A.w - iw * s) / 2;
    var y = (A.h - ih * s) / 2;
    var head = Engrave.head;
    Engrave.print(function (ctx) {
      ctx.drawImage(A.img, x, y, iw * s, ih * s);
    }, A.w, A.h, {
      pr: PR,
      head: { cx: x + head.cx * s, cy: y + head.cy * s, rx: head.rx * s, ry: head.ry * s }
    }, function (print) {
      if (!print) {
        A.failed = true;
        return;
      }
      Engrave.scatter(print, seeded(3), 0.3, 1.2, 8, ME_SPREAD);
      A.print = print;
      A.shown = null;
    });
  }

  /* The name is drawn letter by letter where the page set it, then printed.
     The sample covers only the name, but the lines fly in across the
     whole plate, so they are drawn on a canvas the plate's size. The reel's
     clock waits for this print, since it is the opening frame. */
  function printOpen(done) {
    var plateBox = open.el.getBoundingClientRect();
    var box = open.title.getBoundingClientRect();
    var fs = parseFloat(getComputedStyle(open.title).fontSize);
    var spacing = Math.max(4, Math.min(8, fs / 30));
    var margin = Math.ceil(spacing * 2);
    var bx = Math.max(0, Math.floor(box.left - plateBox.left) - margin);
    var by = Math.max(0, Math.floor(box.top - plateBox.top) - margin);
    var bw = Math.min(W - bx, Math.ceil(box.width) + 2 * margin);
    var bh = Math.min(H - by, Math.ceil(box.height) + 2 * margin);
    Engrave.print(function (ctx) {
      ctx.font = "700 " + fs + "px \"Anybody\"";
      ctx.fillStyle = "#000";
      ctx.textBaseline = "alphabetic";
      var m = ctx.measureText("H");
      var ascent = m.fontBoundingBoxAscent;
      var descent = m.fontBoundingBoxDescent;
      open.title.querySelectorAll(".intro-c").forEach(function (c) {
        var r = c.getBoundingClientRect();
        var base = ascent ? r.top + (r.height - ascent - descent) / 2 + ascent : r.top + r.height * 0.76;
        ctx.fillText(c.textContent.toUpperCase(), r.left - plateBox.left - bx, base - plateBox.top - by);
      });
    }, bw, bh, { pr: PR, spacing: spacing, plain: true, originX: bx * PR, originY: by * PR }, function (print) {
      if (print) {
        Engrave.scatter(print, seeded(1), 0.9, 2.4, bw / spacing * 0.5, SWARM_SPREAD);
        open.swarm.width = Math.round(W * PR);
        open.swarm.height = Math.round(H * PR);
        open.ctx = open.swarm.getContext("2d");
        open.print = print;
      }
      done();
    });
  }

  /* --- 5. The camera ---------------------------------------------------------------
     A view is the board point at the centre of the field, and the scale.
     The camera stops on the name, drops a line to what I do and another
     onto the board, then runs along each row and back to the start of the
     next, like a print carriage. Moving along a row pulls back a touch; the
     carriage return pulls well back, so the board shows for a moment before
     the pull back reveals it. The pull back holds the field's corner still,
     as a real zoom out from the last plate would, and clicks out in five
     equal detents rather than gliding: every new scale redraws the whole
     screen, and five redraws land on time where a glide's dozen would
     stutter. */
  var STOPS = [{ c: 0, r: -2, at: 0, pan: 0 }, { c: 0, r: -1, at: FEED_AT, pan: FEED }].concat(
    PROJECTS.map(function (p, k) {
      return { c: k % 3, r: Math.floor(k / 3), at: starts[k], pan: pans[k], back: pans[k] === RETURN };
    })
  );

  function view(stop) {
    return { x: (stop.c + 0.5) * W, y: (stop.r + 0.5) * H, s: 1 };
  }
  function place(v) {
    return { s: v.s, x: W / 2 - v.x * v.s, y: H / 2 - v.y * v.s };
  }
  function pan(a, b, u, dip) {
    var s = 1 - dip * Math.sin(Math.PI * u);
    return place({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s: s });
  }
  function zoom(a, b, u) {
    var s = a.s * Math.pow(b.s / a.s, u);
    var fx = (b.x - a.x) / (a.s - b.s);
    var fy = (b.y - a.y) / (a.s - b.s);
    return { s: s, x: fx * a.s + a.x - fx * s, y: fy * a.s + a.y - fy * s };
  }

  function cameraAt(t) {
    var last = STOPS[STOPS.length - 1];
    if (t >= PULL_AT) return zoom(place(view(last)), { s: 1 / 3, x: 0, y: 0 }, stepsEnd(5, prog(t, PULL_AT, PULL)));
    for (var i = STOPS.length - 1; i > 0; i--) {
      var stop = STOPS[i];
      if (t < stop.at) continue;
      var p = prog(t, stop.at, stop.pan);
      if (p >= 1) return place(view(stop));
      return stop.back ?
        pan(view(STOPS[i - 1]), view(stop), inOutCubic(p), 0.35) :
        pan(view(STOPS[i - 1]), view(stop), inOutQuart(p), 0.06);
    }
    return place(view(STOPS[0]));
  }

  /* --- 6. Drawing a frame --------------------------------------------------------- */
  var RULE = 2;

  /* Only touch a style when its value changes */
  function put(node, prop, value) {
    var key = "_intro_" + prop;
    if (node[key] === value) return;
    node[key] = value;
    if (prop.charAt(0) === "-") node.style.setProperty(prop, value);
    else node.style[prop] = value;
  }
  function show(node, on) { put(node, "visibility", on ? "visible" : "hidden"); }

  function drawNote(note, m) {
    show(note.el, m > 0);
    note.sides.forEach(function (side, j) {
      var v = clamp01(m - j);
      put(side, "scale", j % 2 ? "1 " + v : v + " 1");
    });
    show(note.chip, m >= 4);
  }

  function renderOpen(t) {
    var lt = t - SWARM_AT;
    var landed = lt >= SWARM_MS + SWARM_SPREAD;
    show(open.title, landed);
    if (!open.print) return;
    if (lt < 0 || landed) {
      if (open.drawn) open.ctx.clearRect(0, 0, open.swarm.width, open.swarm.height);
      open.drawn = false;
    } else {
      drawPrint(open.print, open.ctx, lt, SWARM_MS);
      open.drawn = true;
    }
  }

  /* What I do. Each word drops in a letter at a time, is run over with the
     highlighter in its ink, and drops out again as the next one drops in,
     like a split-flap board. The portrait's ink rolls up to each word's. */
  function renderAbout(t) {
    var now = -1;
    beats.forEach(function (b, i) { if (t >= b) now = i; });
    put(about.me, "--base", "var(--" + SAY[Math.max(0, now - 1)].ink + "-block)");
    put(about.me, "--wash", "var(--" + SAY[Math.max(0, now)].ink + "-block)");
    var rise = now < 1 ? 0 : stepsEnd(4, prog(t, beats[now], WASH_MS));
    put(about.wash, "clipPath", "inset(" + Math.round((1 - rise) * 100) + "% 0 0 0)");

    about.words.forEach(function (w, i) {
      var from = beats[i];
      var until = i + 1 < beats.length ? beats[i + 1] : Infinity;
      var n = w.chars.length;
      var gap = Math.min(0.012, 0.15 / n);
      for (var j = 0; j < n; j++) {
        var din = from + (i ? WORD_IN : 0) + j * gap;
        var dout = until + j * gap;
        var y;
        var on;
        if (t < dout) {
          on = t > din;
          y = -100 * (1 - stepsStart(3, prog(t, din, WORD_CHAR)));
        } else {
          var gone = prog(t, dout, WORD_CHAR);
          on = gone < 1;
          y = 100 * stepsStart(3, gone);
        }
        show(w.chars[j], on);
        put(w.chars[j], "translate", "0 " + Math.round(y) + "%");
      }
      var live = t >= from && t < until;
      w.lines.forEach(function (l, li) {
        var m = live ? stepsEnd(6, prog(t, from + WORD_MARK_AT + li * 0.05, WORD_MARK_MS)) : 0;
        put(l, "backgroundSize", Math.round(m * 100) + "% 100%");
      });
      if (w.tag) show(w.tag, live && t >= from + TAG_AT);
      if (w.note) drawNote(w.note, live ? stepsEnd(8, prog(t, from + NOTE_AT, NOTE_MS)) * 4 : 0);
    });

    renderPrint(about, t - FEED_AT, ME_MS, ME_SPREAD);
  }

  function renderRail(t) {
    var y = t >= CLEAR_AT ?
      leave(prog(t, CLEAR_AT + RAIL_AT, RAIL_MS)) * 100 :   /* last out, off the bottom */
      (stepsEnd(5, prog(t, 0, 0.325)) - 1) * 100;          /* in from the top, like Lock */
    put(rail, "translate", "0 " + y.toFixed(2) + "%");
    var index = FLICK_AT + INTO / 2;
    show(railName, t >= 0.2 && t < FEED_AT + FEED / 2);
    show(railSay, t >= FEED_AT + FEED / 2 && t < index);
    /* The plate on screen lights its number; as the whole board holds, every
       number lights in turn, 01 to 09, each in its plate's ink */
    var on = -1;
    for (var k = 0; k < 9; k++) if (t >= starts[k] + pans[k] / 2) on = k;
    var lit = t >= HOLD_AT ? Math.floor((t - HOLD_AT) / CASCADE) : -1;
    items.forEach(function (li, j) {
      show(li, t >= index + j / FPS);
      var is = j === on || j <= lit;
      if (li._lit !== is) {
        li._lit = is;
        li.classList.toggle("is-on", is);
      }
    });
  }

  function renderShot(P, lt, land) {
    if (!P.print) return;
    var ctx = P.ctx;
    if (lt < 0) {
      if (P.shown !== -1) ctx.clearRect(0, 0, P.canvas.width, P.canvas.height);
      P.shown = -1;
      return;
    }
    if (lt < PRINT_MS + PRINT_SPREAD) {
      drawPrint(P.print, ctx, lt, PRINT_MS);
      P.shown = 0;
      return;
    }
    /* A live site's capture then develops over its print, a band at a time */
    var bands = P.p.shot ? Math.round(stepsEnd(4, prog(lt, land + DEV_AT, DEV_MS)) * 4) : 0;
    if (P.shown === 1 + bands) return;
    P.shown = 1 + bands;
    drawPrint(P.print, ctx, Infinity, PRINT_MS);
    if (!bands) return;
    var cw = P.canvas.width;
    var ch = P.canvas.height;
    var f = fit(cw, ch, P.p.focus);
    /* The bands run down the picture itself, which on a phone's plate is
       only the middle of the canvas */
    var top = Math.max(0, f.y);
    var bottom = Math.min(ch, f.y + f.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, cw, Math.round((bottom - top) * bands / 4));
    ctx.clip();
    ctx.drawImage(P.img, f.x, f.y, f.w, f.h);
    ctx.restore();
  }

  /* On the final board each plate's section title drops out and the project's
     own name drops in, plate by plate, as the rail lights that plate's number */
  var namesDone = false;
  function renderNames(t) {
    plates.forEach(function (P) {
      var at = HOLD_AT + P.k * CASCADE;
      var n = P.chars.length;
      var gap = Math.min(0.008, 0.12 / n);
      for (var j = 0; j < n; j++) {
        var gone = prog(t, at + j * gap, CHAR_MS);
        show(P.chars[j], gone < 1);
        put(P.chars[j], "translate", "0 " + Math.round(100 * stepsStart(3, gone)) + "%");
      }
      n = P.nameChars.length;
      gap = Math.min(0.008, 0.12 / n);
      for (j = 0; j < n; j++) {
        var from = at + CHAR_MS / 2 + j * gap;
        show(P.nameChars[j], t > from);
        put(P.nameChars[j], "translate", "0 " + Math.round(-100 * (1 - stepsStart(3, prog(t, from, CHAR_MS)))) + "%");
      }
    });
    namesDone = t >= HOLD_AT + PROJECTS.length * CASCADE + CHAR_MS * 2 + 0.2;
  }

  function renderPlate(P, lt, namesOn) {
    var land = pans[P.k];
    var n = namesOn ? 0 : P.chars.length;
    var gap = Math.min(0.008, 0.12 / P.chars.length);
    /* Only the first plate of a section lands its title: on the rest it is
       already standing, so it holds as the camera moves along */
    var lead = !P.k || PROJECTS[P.k - 1].name !== P.p.name;
    for (var j = 0; j < n; j++) {
      if (!lead) {
        show(P.chars[j], true);
        put(P.chars[j], "translate", "0 0%");
        continue;
      }
      var from = land / 2 + j * gap;
      show(P.chars[j], lt > from);
      put(P.chars[j], "translate", "0 " + Math.round(-100 * (1 - stepsStart(3, prog(lt, from, CHAR_MS)))) + "%");
    }
    renderShot(P, lt, land);
  }

  function renderClear(t) {
    if (t < CLEAR_AT) return;
    var lt = t - CLEAR_AT;
    /* The paper can go at once: the whole board still covers the screen, so
       from here on the page is only ever uncovered by something moving */
    overlay.classList.add("is-leaving", "is-clear");
    /* Each row of plates is a lane, and the lanes alternate, as Home's rows
       do, so each of Home's rows comes in behind a lane leaving the same
       way. In each lane the plate nearest the exit goes first (section 20,
       rule 1). The board is at a third of its size, so the field's width on
       screen is three plates' width on the board. */
    plates.forEach(function (P) {
      var dir = P.r % 2 ? -1 : 1;
      var near = dir > 0 ? 2 - P.c : P.c;
      var off = leave(prog(lt, P.r * LANE_GAP + near * PLATE_GAP, LANE_MS));
      put(P.el, "translate", (dir * off * 3 * W).toFixed(1) + "px 0");
    });
    if (lt >= HOME_AT) root.classList.remove("intro-hold");
    if (lt >= RAIL_AT + RAIL_MS) finish();
  }

  function render(t) {
    var cam = cameraAt(t);
    var near = t < PULL_AT - 0.15;
    /* Near full size the board moves as one layer, so a camera move only
       repaints what changes on a plate. For the pull back it is painted at
       the size it is seen instead, rather than held in memory whole at full
       size; the switch is made while the last plate stands still, so its
       one redraw goes unseen. Once the whole board is in view each plate
       becomes a layer of its own at that size, and the clear that follows
       only moves layers. */
    put(board, "willChange", near ? "transform" : "auto");
    var parked = t >= HOLD_AT;
    plates.forEach(function (P) { put(P.el, "willChange", parked ? "transform" : "auto"); });
    put(board, "transform", "translate(" + cam.x.toFixed(2) + "px," + cam.y.toFixed(2) + "px) scale(" + cam.s.toFixed(5) + ")");
    /* Rules keep their weight on screen once the camera is well back. The
       brief dips along the way are left alone: re-weighing every rule would
       restyle the whole board for a difference nobody could see. */
    put(board, "--rw", (near ? RULE : RULE / cam.s).toFixed(2) + "px");

    renderRail(t);

    /* The two plates about me only change while they can be seen */
    if (t < FEED_AT + FEED) renderOpen(t);
    else if (!open.gone) {
      open.gone = true;
      show(open.title, true);
      open.swarm.width = 0;   /* its lines have landed for good */
    }
    if (t < FLICK_AT + INTO) renderAbout(t);
    else if (!about.gone) {
      about.gone = true;
      renderAbout(FLICK_AT + INTO);
    }

    plates.forEach(function (P) {
      if (P.final) return;
      var lt = t - starts[P.k];
      if (lt < -0.1) return;
      var settled = lt >= pans[P.k] + DEV_AT + DEV_MS + 0.06;
      renderPlate(P, settled ? Infinity : lt, t >= HOLD_AT);
      /* A picture still on its way keeps the plate live until it lands */
      if (settled && (P.print || P.failed)) P.final = true;
    });
    if (t >= HOLD_AT && !namesDone) renderNames(t);

    renderClear(t);
  }

  /* --- 7. Hand-over, skipping and giving up ------------------------------------
     The clock only runs while the tab is on screen, and a long frame counts
     as a short one, so a stalled reel picks up where it stopped. */
  var clock = 0;
  var last = 0;
  var frame = -1;
  var raf = 0;
  var started = false;
  var finished = false;
  var resizes;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (last) clock += Math.min(now - last, 50) / 1000;
    last = now;
    /* The reel runs on its film clock; the hand-over glides at the screen's
       own rate */
    if (clock >= CLEAR_AT) {
      render(clock);
      return;
    }
    var f = Math.floor(clock * FPS + 1e-6);
    if (f !== frame) {
      frame = f;
      render(f / FPS);
    } else if (queue.length) {
      /* One picture per spare frame, so printing never drops a frame */
      queue.shift()();
    }
  }

  /* Straight to the board leaving, with every plate finished */
  function skip() {
    if (finished) return;
    if (!started) {
      finish();
      return;
    }
    if (clock >= CLEAR_AT) return;
    while (queue.length) queue.shift()();
    clock = CLEAR_AT;
    frame = -1;
  }

  var SCROLL_KEYS = /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| |Spacebar)$/;
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") skip();
    /* Enter and Space on the button press it; a scroll key wants the page */
    else if (e.target !== skipBtn && SCROLL_KEYS.test(e.key)) {
      e.preventDefault();
      skip();
    }
  }
  /* Focus moving onto something in the page means the reader wants it. The
     document itself taking focus back, as a tab coming forward can, does not. */
  function onFocus(e) {
    var to = e.target;
    if (to !== document.body && to !== root && !overlay.contains(to)) skip();
  }
  function onPress(e) {
    if (e.button === 0) skip();
  }
  function onWheel(e) {
    e.preventDefault();
    skip();
  }

  /* Give the page back, whether the reel ended, was skipped before it could
     start, or has to stop now (a resize, or the page being left). */
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (resizes) resizes.disconnect();
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("focusin", onFocus);
    window.removeEventListener("pagehide", finish);
    root.classList.remove("intro-hold", "intro-on", "intro-live");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    Engrave.release();
    /* Home's entrance keeps its gliding timing until it has landed; dropped
       mid-flight, it would jump to the stepped one. After that the page
       moves like every other page of the site. */
    var sheet = document.querySelector(".sheet");
    var landing = sheet && sheet.getAnimations ? sheet.getAnimations({ subtree: true }) : [];
    var landed = function () { root.classList.remove("intro-land"); };
    Promise.all(landing.map(function (a) { return a.finished; })).then(landed, landed);
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve(true);
    return Promise.all([
      document.fonts.load("700 1em \"Space Mono\""),
      document.fonts.load("400 1em \"Space Mono\""),
      document.fonts.load("700 1em \"Anybody\"")
    ]).then(function () {
      return document.fonts.check("700 1em \"Anybody\"");
    });
  }

  function init() {
    overlay = document.querySelector(".intro");
    stage = overlay && overlay.querySelector(".intro-stage");
    skipBtn = overlay && overlay.querySelector(".intro-skip");
    if (!stage || !skipBtn) {
      finish();
      return;
    }

    overlay.addEventListener("pointerdown", onPress);
    overlay.addEventListener("wheel", onWheel, { passive: false });
    skipBtn.addEventListener("click", skip);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("pagehide", finish);

    RULE = parseFloat(getComputedStyle(document.body).getPropertyValue("--rule-w")) || RULE;
    build();
    measure();
    load(about, IMG + "stefan/portrait.webp", printMe);
    plates.forEach(function (P) {
      var p = P.p;
      load(P, IMG + (p.shot ? p.shot + (P.w * PR > 1000 ? "desktop-hero.webp" : "thumb.webp") : "objects/" + p.object + ".svg"), printPlate);
      renderPlate(P, -1);   /* every plate starts blank, however far off it is */
    });
    render(0);

    /* The reel waits for its faces or does not play */
    var late = new Promise(function (resolve) { setTimeout(resolve, 1500, false); });
    Promise.race([fontsReady(), late]).then(function (ok) {
      if (finished) return;
      if (!ok) {
        finish();
        return;
      }
      try { sessionStorage.setItem("sc-intro", "1"); } catch (e) { /* storage off: it may play again */ }
      printOpen(function () {
        if (finished) return;
        started = true;
        render(0);
        /* One untimed frame to put the board up, so its first redraw is not
           taken out of the opening second */
        raf = requestAnimationFrame(function () { raf = requestAnimationFrame(tick); });

        if ("ResizeObserver" in window) {
          resizes = new ResizeObserver(function () {
            /* A new width breaks the board, so the page takes over. A phone's
               toolbars only change the height a little, and are let be. */
            if (Math.abs(overlay.clientWidth - sizeW) > 1 || Math.abs(overlay.clientHeight - sizeH) > 150) finish();
          });
          resizes.observe(overlay);
        }
      });
    }, finish);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
