/* ==========================================================================
   STEFAN CARTER | LANDING REEL
   Home only. index.html's <head> decides before the first paint whether the
   reel plays (a visitor arriving from outside the site, once a session, not
   for reduced motion), and loads this file only when it will. The look is
   styles.css section 22.

   About nine seconds, in four parts, cut on an eighth-of-a-second grid.
   Who: the name prints itself from flying lines of engraving, then the
   camera drops a line to the portrait and what I do, four words. The work:
   the camera drops onto a ruled board of the nine projects and flicks along
   it like a print carriage, each row faster than the last, every plate
   landing with its project's name. The board: it pulls back to show all
   nine, and holds. Home: the camera goes back up to the name, which sets
   itself into Home's own heading while the page packs in round it.

   Ink steps and travel glides. Whatever prints (letters, the highlighter,
   the wash, a capture developing, the engraved lines, the index) moves in
   frames, 30 a second. Whatever travels (the camera, the rail, the name
   setting) is eased and drawn at the screen's own rate.

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
     its Now; the practice; and last the award, which says Finalist itself
     and stays standing as the camera leaves. Each word takes one ink, and
     the portrait beside it changes ink with it. Its hold is how long it
     stays.

     Then the nine projects, each under its own name, with its practice on a
     tab at the corner of its picture. The three live sites with the best
     captures take the first, slowest row, and Bird Watcher's capture closes
     the board, since the pull back starts from it. A capture spans the
     plate's width and, where the plate is wider than 16:10, is cropped top
     and bottom about its focus, the share of its height held in view: Bird
     Watcher's headline sits high, so it keeps its top. A project with no
     captures shows its engraved object (assets/img/objects), so no Instem UI
     ever appears (PRODUCT.md).

     /?intro&draft tries the four drawn Instem plates (assets/img/plates)
     in place of their objects: full width diagrams, printed in a sweep. */
  var IMG = "/assets/img/";
  var DRAFT = /[?&]draft\b/.test(location.search);
  var SAY = [
    { lines: ["Senior", "product", "designer"], tag: "Now", ink: "moss", hold: 0.5 },
    { lines: ["Design", "systems"], ink: "slate", hold: 0.375 },
    { lines: ["Design", "engineering"], ink: "rose", hold: 0.375 },
    { lines: ["Finalist", "Digital Hero", "of the Year"], note: "2026", ink: "amber", hold: 0.5 }
  ];
  var PRODUCT = "Product design";
  var WEB = "Web design";
  var PROJECTS = [
    { kind: WEB, title: ["Nick", "Hampshire"], shot: "nick-hampshire/" },
    { kind: WEB, title: ["No", "Boundaries"], shot: "no-boundaries/" },
    { kind: WEB, title: ["Visit", "Stafford"], shot: "visit-stafford/" },
    { kind: PRODUCT, title: ["Centrus"], object: "centrus", plate: true },
    { kind: PRODUCT, title: ["Preclinical", "Insights"], object: "preclinical-insights", plate: true },
    { kind: PRODUCT, title: ["KnowledgeScan"], object: "knowledgescan", plate: true },
    { kind: PRODUCT, title: ["InstemUX"], object: "instemux", plate: true },
    { kind: WEB, title: ["Wrottesley", "Golf Club"], object: "wrottesley-golf" },
    { kind: WEB, title: ["Bird", "Watcher"], shot: "bird-watcher/", focus: 0.2 }
  ];
  /* What each plate gets, from the camera setting off for it to the camera
     leaving it, and how much of that is the move. Each row is faster than
     the one before; the last flicks. */
  var SLOTS = [
    [0.75, 0.25], [0.625, 0.15], [0.5, 0.15],
    [0.5, 0.2], [0.375, 0.12], [0.375, 0.12],
    [0.25, 0.15], [0.25, 0.1], [0.25, 0.1]
  ];
  var FLICK = 0.25;   /* a slot this short has no time to print: its plate arrives whole */
  /* Plate by plate through the four inks of section 21, so the whole board
     reads as a print run of all four, on the diagonal */
  var INKS = ["moss", "amber", "rose", "slate"];

  /* --- 2. Time ---------------------------------------------------------------------
     One clock, in seconds. Every frame is a pure function of it, which is
     how a skip can jump straight to any frame. What travels reads the clock
     as it stands; what prints reads it in frames, FPS a second. A plate's
     own times are counted from the start of the camera move that brings it
     in, and its name lands when that move does. */
  var FPS = 30;

  /* Who */
  var SWARM_AT = 0.04, SWARM_MS = 0.40, SWARM_SPREAD = 0.12;   /* the name, from lines */
  var FEED_AT = 0.75, FEED = 0.25;      /* down a line, from the name to what I do */
  var ME_MS = 0.40, ME_SPREAD = 0.10;   /* the portrait printing, from FEED_AT */
  var WORD_CHAR = 0.07;                 /* one letter of a word dropping in */
  var WIPE = 2 / FPS;                   /* the old word cut away, whole, before the new one starts */
  var WORD_MARK_AT = 0.10, WORD_MARK_MS = 0.15;   /* these from a word's start */
  var TAG_AT = 0.20;
  var NOTE_AT = 0.20, NOTE_MS = 0.20;
  var WASH_MS = 0.16;                   /* the portrait's ink rolling up to the next */

  /* The work */
  var PRINT_MS = 0.14, PRINT_SPREAD = 0.04;   /* a plate's picture, from its start */
  var SWEEP = 0.14;                           /* a drawn plate printing across, left to right */
  var CHAR_MS = 0.07;                         /* one letter of a name dropping in */
  var DEV_AT = 0.02, DEV_MS = 0.07;           /* a capture developing, from landing */

  /* The board */
  var PULL = 0.5;       /* out to the whole board */
  var HOLD = 0.875;     /* the whole board, held */
  var CASCADE = 0.04;   /* the rail's index lighting up, number by number, as it holds */

  /* Home. The camera goes back to the name (BACK), and the name then sets
     itself into Home's heading (SET) over the page, whose own entrance is
     released at the same moment on its original settle curve (section 22's
     html.intro-land), so the page packs in round a name that is already
     arriving. The rail is the spine throughout: the mark stays where the
     nav's own sits, and the rail only slides away once Home's rails are
     dropping in above it. RAIL_AT is timed against that drop, --vt-lock-at
     at intro-land's pace, and has to move with it. */
  var BACK = 0.5;
  var SET = 0.375;
  var RAIL_AT = 0.19, RAIL_MS = 0.55;   /* from the name starting to set */

  var ABOUT_AT = FEED_AT + FEED;
  var beats = [];
  var at = ABOUT_AT;
  SAY.forEach(function (word) {
    beats.push(at);
    at += word.hold;
  });
  var FLICK_AT = at;
  var INTO = SLOTS[0][1];
  var starts = [];
  var pans = [];
  SLOTS.forEach(function (slot) {
    starts.push(at);
    pans.push(slot[1]);
    at += slot[0];
  });
  var LAST = PROJECTS.length - 1;
  var PULL_AT = at;
  var HOLD_AT = PULL_AT + PULL;
  var BACK_AT = HOLD_AT + HOLD;
  var SET_AT = BACK_AT + BACK;
  var CUT_AT = SET_AT + SET;
  var END_AT = SET_AT + RAIL_AT + RAIL_MS;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function prog(t, from, span) { return clamp01((t - from) / span); }
  /* Steps that land on their last value only at the end, like jump-end... */
  function stepsEnd(n, p) { return p >= 1 ? 1 : Math.floor(p * n) / n; }
  /* ...and steps that jump at once, like jump-start */
  function stepsStart(n, p) { return p <= 0 ? 0 : Math.ceil(p * n) / n; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  /* A camera move: it leans back a touch before it goes and runs a touch
     past its stop before it settles, by about a hundredth of the way */
  function carry(x) {
    var c = 0.55 * 1.525;
    return x < 0.5 ?
      Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c) / 2 :
      (Math.pow(2 * x - 2, 2) * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
  }
  /* Out fast and past, then back: the pull back's settle */
  function past(x) {
    var c = 0.7;
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  }
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
  var settleIn = bezier(0.16, 1, 0.3, 1);   /* the system's settle, as Home's rows land on */

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

  /* Where a drawn 16:10 plate lies in the box: whole, as large as it goes
     with a margin, and centred */
  function within(w, h) {
    var ph = Math.min(w / 1.6, h) * 0.88;
    return { x: (w - ph * 1.6) / 2, y: (h - ph) / 2, w: ph * 1.6, h: ph };
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
  var overlay, stage, skipBtn, field, rail, railName, railSay, board, sheet, sheetCtx, items, open, about, W, H, sizeW, sizeH;
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

    /* The project's name, sized to its own length */
    var head = make("div", "intro-head");
    var title = make("p", "intro-title");
    var chars = [];
    title.style.setProperty("--chars", p.title.join(" ").length);
    title.style.setProperty("--chars-n", Math.max.apply(null, p.title.map(function (l) { return l.length; })));
    title.style.setProperty("--lines-n", p.title.length);
    p.title.forEach(function (line, i) {
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

    /* Its picture, with its practice on a tab at the corner */
    var shot = make("div", "intro-shot");
    var canvas = make("canvas", "intro-print");
    shot.appendChild(canvas);
    var kind = shot.appendChild(make("span", "intro-kind", p.kind));

    grid.appendChild(head);
    grid.appendChild(shot);
    var rule = grid.appendChild(make("span", "intro-rule intro-rule-a"));
    plate.appendChild(grid);

    return {
      el: plate, p: p, k: k, c: k % 3, r: Math.floor(k / 3),
      chars: chars, shot: shot, kind: kind, rule: rule, canvas: canvas, ctx: null,
      img: null, failed: false, print: null, shown: null, final: false,
      /* A drawn plate spans the width like a capture and prints in a sweep */
      wide: DRAFT && !!p.plate, flick: SLOTS[k][0] <= FLICK,
      spread: DRAFT && p.plate ? SWEEP : PRINT_SPREAD, lay: null, tiled: false
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

    field = make("div", "intro-field");
    /* The whole board as one picture, under the board itself (section 5) */
    sheet = field.appendChild(make("canvas", "intro-sheet"));
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

    sheet.width = Math.round(W * PR);
    sheet.height = Math.round(H * PR);
    sheet.style.width = W + "px";
    sheet.style.height = H + "px";
    sheetCtx = sheet.getContext("2d");
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
    var f = P.p.shot ? fit(P.w, P.h, P.p.focus) : P.wide ? within(P.w, P.h) : Engrave.place(P.img, P.w, P.h);
    Engrave.print(function (ctx) {
      ctx.drawImage(P.img, f.x, f.y, f.w, f.h);
    }, P.w, P.h, { pr: PR, relief: !P.p.shot }, function (print) {
      if (!print) {
        P.failed = true;
        return;
      }
      Engrave.scatter(print, seeded(7 + P.k * 101), 0.3, 1.2, 8, PRINT_SPREAD);
      /* A drawn plate is cut across, left to right, like a tool crossing it */
      if (P.wide) {
        var across = P.w * print.pr;
        for (var i = 0; i < print.pieces; i++) print.wait[i] = clamp01(print.homeX[i] / across) * SWEEP;
      }
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
     as a real zoom out from the last plate would, and the way back to the
     name is the same zoom run the other way. Every move is eased and drawn
     at the screen's rate, and each is only ever a transform (see the sheet,
     below), so none of them repaints. */
  var STOPS = [{ c: 0, r: -2, at: 0, pan: 0 }, { c: 0, r: -1, at: FEED_AT, pan: FEED }].concat(
    PROJECTS.map(function (p, k) {
      return { c: k % 3, r: Math.floor(k / 3), at: starts[k], pan: pans[k], back: k > 0 && k % 3 === 0 };
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

  var WHOLE = { s: 1 / 3, x: 0, y: 0 };
  function cameraAt(t) {
    if (t >= BACK_AT) return zoom(WHOLE, place(view(STOPS[0])), carry(prog(t, BACK_AT, BACK)));
    if (t >= PULL_AT) return zoom(place(view(STOPS[STOPS.length - 1])), WHOLE, past(prog(t, PULL_AT, PULL)));
    for (var i = STOPS.length - 1; i > 0; i--) {
      var stop = STOPS[i];
      if (t < stop.at) continue;
      var p = prog(t, stop.at, stop.pan);
      if (p >= 1) return place(view(stop));
      return pan(view(STOPS[i - 1]), view(stop), carry(p), stop.back ? 0.35 : 0.06);
    }
    return place(view(STOPS[0]));
  }

  /* The sheet: the whole board as one picture, a third of its size, which is
     the size it is seen at once the camera is back. Each plate is painted
     onto it once, when its picture has landed: its block, its print as it
     stands, its name letter by letter where the page set it (as printOpen
     sets the name), its tab and its rules. From the pull back on, the
     plates themselves are put away and the sheet stands in for them, so
     pulling back and going back up to the name move two layers and paint
     nothing. It is soft only while it is larger than life, which is while
     it is moving fastest. */
  var colours = null;
  function layoutPlates() {
    colours = {
      paper: getComputedStyle(plates[0].el).backgroundColor,
      ink: getComputedStyle(rail).backgroundColor
    };
    plates.forEach(function (P) {
      var box = P.el.getBoundingClientRect();
      function rel(node) {
        var r = node.getBoundingClientRect();
        return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
      }
      var rule = rel(P.rule);
      P.lay = {
        fs: parseFloat(getComputedStyle(P.chars[0].parentNode.parentNode).fontSize),
        /* A letter waiting to drop in is measured where it will land */
        chars: P.chars.map(function (c) {
          var was = c.style.translate;
          c.style.translate = "none";
          var r = rel(c);
          c.style.translate = was;
          r.ch = c.textContent.toUpperCase();
          return r;
        }),
        shot: rel(P.shot),
        kind: rel(P.kind),
        ruleY: rule.y + rule.h / 2,
        block: getComputedStyle(P.shot).backgroundColor
      };
    });
  }

  function paintTile(P) {
    if (P.tiled || !P.lay) return;
    P.tiled = true;
    var L = P.lay;
    var ctx = sheetCtx;
    var q = PR / 3;
    var edge = RULE * 3;   /* a rule, in the plate's own pixels, as it will be seen */
    ctx.save();
    ctx.setTransform(q, 0, 0, q, P.c * W * q, P.r * H * q);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = colours.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = L.block;
    ctx.fillRect(L.shot.x, L.shot.y, L.shot.w, L.shot.h);
    if (P.canvas.width && P.canvas.height) ctx.drawImage(P.canvas, L.shot.x, L.shot.y, L.shot.w, L.shot.h);
    ctx.fillStyle = colours.ink;
    ctx.fillRect(L.kind.x, L.kind.y, L.kind.w, L.kind.h);
    ctx.font = "700 " + L.fs + "px \"Anybody\"";
    ctx.textBaseline = "alphabetic";
    var m = ctx.measureText("H");
    var ascent = m.fontBoundingBoxAscent;
    var descent = m.fontBoundingBoxDescent;
    L.chars.forEach(function (c) {
      ctx.fillText(c.ch, c.x, ascent ? c.y + (c.h - ascent - descent) / 2 + ascent : c.y + c.h * 0.76);
    });
    ctx.fillRect(0, L.ruleY - edge / 2, W, edge);
    ctx.fillRect(0, 0, W, edge / 2);
    ctx.fillRect(0, H - edge / 2, W, edge / 2);
    ctx.fillRect(0, 0, edge / 2, H);
    ctx.fillRect(W - edge / 2, 0, edge / 2, H);
    ctx.restore();
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
  /* Put away altogether, letters and all: a letter that has been shown stays
     visible inside a hidden plate */
  function keep(node, on) { put(node, "display", on ? "" : "none"); }

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

  /* What I do. Each word drops in a letter at a time and is run over with
     the highlighter in its ink. The word before it is cut away whole first,
     down behind its own line in two frames, and the new one only starts
     once it has gone, so two words are never in the slot together. The
     portrait's ink rolls up to each word's. */
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
      var gap = Math.min(0.008, 0.08 / n);
      for (var j = 0; j < n; j++) {
        var din = from + (i ? WIPE : 0) + j * gap;
        var y;
        var on;
        if (t < until) {
          on = t > din;
          y = -100 * (1 - stepsStart(3, prog(t, din, WORD_CHAR)));
        } else {
          var gone = prog(t, until, WIPE);
          on = gone < 1 - 1e-6;
          y = 100 * stepsStart(2, gone);
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
    var y = t >= SET_AT ?
      leave(prog(t, SET_AT + RAIL_AT, RAIL_MS)) * 100 :   /* last out, off the bottom */
      (outCubic(prog(t, 0, 0.325)) - 1) * 100;           /* in from the top, like Lock */
    put(rail, "translate", "0 " + y.toFixed(2) + "%");
  }

  /* What the rail says: Portfolio by the name, at both ends of the reel,
     Practice by the words, and the index by the board */
  function renderIndex(t) {
    var index = FLICK_AT + INTO / 2;
    var back = BACK_AT + BACK / 2;
    show(railName, (t >= 0.2 && t < FEED_AT + FEED / 2) || (t >= back && t < SET_AT));
    show(railSay, t >= FEED_AT + FEED / 2 && t < index);
    /* The plate on screen lights its number; as the whole board holds, every
       number lights in turn, 01 to 09, each in its plate's ink */
    var on = -1;
    for (var k = 0; k < 9; k++) if (t >= starts[k] + pans[k] / 2) on = k;
    var lit = t >= HOLD_AT ? Math.floor((t - HOLD_AT) / CASCADE) : -1;
    items.forEach(function (li, j) {
      show(li, t >= index + j / FPS && t < back);
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
    var printed = PRINT_MS + P.spread;
    /* A plate the camera only flicks past starts early, out of sight, and
       is whole, and developing, as the camera reaches it */
    var develop = land + DEV_AT;
    if (P.flick) {
      lt += printed;
      develop = printed;
    }
    if (lt < 0) {
      if (P.shown !== -1) ctx.clearRect(0, 0, P.canvas.width, P.canvas.height);
      P.shown = -1;
      return;
    }
    if (lt < printed) {
      drawPrint(P.print, ctx, lt, PRINT_MS);
      P.shown = 0;
      return;
    }
    /* A live site's capture then develops over its print, a band at a time */
    var bands = P.p.shot ? Math.round(stepsEnd(4, prog(lt, develop, DEV_MS)) * 4) : 0;
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

  /* A plate's name drops in a letter at a time as the camera lands on it. On
     a plate the camera only flicks past it is stamped whole. */
  function renderPlate(P, lt) {
    var land = pans[P.k];
    var n = P.chars.length;
    var gap = P.flick ? 0 : Math.min(0.008, 0.12 / n);
    for (var j = 0; j < n; j++) {
      var from = land / 2 + j * gap;
      show(P.chars[j], lt > from);
      put(P.chars[j], "translate", "0 " + (P.flick ? 0 : Math.round(-100 * (1 - stepsStart(3, prog(lt, from, CHAR_MS))))) + "%");
    }
    renderShot(P, lt, land);
  }

  /* The name setting into Home's heading. A copy of the heading is laid over
     the page exactly where the heading is, word for word, in the heading's
     own type, and each word starts enlarged and moved onto the reel's word,
     so the last frame of the move is the heading itself, pixel for pixel,
     and the page's own can take over unseen. The page is bare beneath it
     apart from the name's own cell: its other rows are released as the
     name sets off, and pack in round it. */
  var setter = null;
  function wordBox(node, from, to) {
    var range = document.createRange();
    range.setStart(node, from);
    range.setEnd(node, to);
    return range.getBoundingClientRect();
  }
  function beginSet() {
    setter = { el: null, words: [], cut: false };
    var heading = document.querySelector(".page-home .c-hero");
    var text = heading && heading.firstChild;
    /* The reel's words as they stand, measured before the board is put away */
    var from = Array.prototype.map.call(open.title.querySelectorAll(".intro-ow"), function (w) {
      return w.getBoundingClientRect();
    });
    keep(field, false);
    overlay.classList.add("is-leaving", "is-clear");
    root.classList.remove("intro-hold");
    if (!text || text.nodeType !== 3) {
      cut();
      return;
    }

    var style = getComputedStyle(heading);
    var box = heading.getBoundingClientRect();
    var el = make("p", "intro-set");
    ["fontFamily", "fontSize", "fontWeight", "fontStretch", "fontVariationSettings", "fontKerning",
      "fontFeatureSettings", "letterSpacing", "wordSpacing", "lineHeight", "textTransform", "whiteSpace",
      "textAlign", "color", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].forEach(function (prop) {
      el.style[prop] = style[prop];
    });
    el.style.left = box.left + "px";
    el.style.top = box.top + "px";
    el.style.width = box.width + "px";
    el.style.height = box.height + "px";
    var homes = [];
    var word = /\S+/g;
    var found;
    while ((found = word.exec(text.data))) {
      if (homes.length) el.appendChild(document.createTextNode(" "));
      setter.words.push({ el: el.appendChild(make("span", "intro-sw", found[0])) });
      homes.push(wordBox(text, found.index, found.index + found[0].length));
    }
    overlay.appendChild(el);
    setter.el = el;

    setter.words.forEach(function (w, i) {
      var span = w.el.getBoundingClientRect();
      var own = wordBox(w.el.firstChild, 0, w.el.firstChild.length);
      var start = from[i] || homes[i];
      w.el.style.transformOrigin = (own.left - span.left) + "px " + (own.top - span.top) + "px";
      w.k = start.height / own.height;
      w.x0 = start.left - own.left;
      w.y0 = start.top - own.top;
      /* Where the heading's word really is, should the copy sit a hair off it */
      w.x1 = homes[i].left - own.left;
      w.y1 = homes[i].top - own.top;
    });
  }
  function cut() {
    setter.cut = true;
    if (setter.el) overlay.removeChild(setter.el);
    root.classList.remove("intro-name");
  }
  function renderHome(t) {
    if (t < SET_AT) return;
    if (!setter) beginSet();
    if (!setter.cut) {
      if (t >= CUT_AT) cut();
      else {
        /* Home a couple of frames before the cut, so the cut is between two
           identical frames */
        var u = settleIn(prog(t, SET_AT, SET - 0.04));
        setter.words.forEach(function (w) {
          put(w.el, "transform", "translate(" + (w.x0 + (w.x1 - w.x0) * u).toFixed(2) + "px," +
            (w.y0 + (w.y1 - w.y0) * u).toFixed(2) + "px) scale(" + Math.pow(w.k, 1 - u).toFixed(5) + ")");
        });
      }
    }
    if (t >= END_AT) finish();
  }

  /* What prints, drawn once a frame of the film clock */
  function renderInk(t) {
    renderIndex(t);

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
      if (lt < -0.4) return;
      var settled = lt >= Math.max(pans[P.k] + DEV_AT + DEV_MS, PRINT_MS + P.spread) + 0.06;
      renderPlate(P, settled ? Infinity : lt);
      /* A picture still on its way keeps the plate live until it lands */
      if (settled && (P.print || P.failed)) {
        P.final = true;
        paintTile(P);
      }
    });
  }

  /* Returns whether this frame printed, as well as moved */
  function render(t) {
    var cam = cameraAt(t);
    var pulled = t >= PULL_AT;
    /* From the pull back on, the sheet stands in for the plates: only the
       last one stays, shrinking onto its own place on the sheet, and the
       name's plate comes back for the way home. Its rules are doubled for
       that move, while it still stands, so they do not thin away with it. */
    keep(open.el, !pulled || t >= BACK_AT);
    keep(about.el, !pulled);
    plates.forEach(function (P) { keep(P.el, !pulled || (P.k === LAST && t < HOLD_AT)); });
    put(plates[LAST].el, "--rw", (t >= PULL_AT - 0.1 ? RULE * 2 : RULE) + "px");
    show(sheet, pulled);
    var move = "translate(" + cam.x.toFixed(2) + "px," + cam.y.toFixed(2) + "px) scale(";
    put(board, "transform", move + cam.s.toFixed(5) + ")");
    put(sheet, "transform", move + (cam.s * 3).toFixed(5) + ")");

    renderRail(t);

    var f = Math.floor(t * FPS + 1e-6);
    var inked = f !== frame;
    if (inked) {
      frame = f;
      renderInk(f / FPS);
    }
    /* Whatever has not made it onto the sheet by the time it is needed goes
       on as it stands */
    if (pulled) plates.forEach(function (P) { if (P.k < LAST || t >= HOLD_AT) paintTile(P); });

    renderHome(t);
    return inked;
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
    /* What travels is drawn every time; what prints, once a frame of the
       film clock. One picture is sent to be cut on a frame that printed
       nothing, so printing never drops a frame. */
    if (!render(clock) && queue.length && !finished) queue.shift()();
  }

  /* Straight to the name setting into the page */
  function skip() {
    if (finished) return;
    if (!started) {
      finish();
      return;
    }
    if (clock >= SET_AT) return;
    queue.length = 0;
    clock = SET_AT;
    frame = -1;
  }

  var SCROLL_KEYS = /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| |Spacebar)$/;
  function onKey(e) {
    /* Once the name is setting, the page is the reader's */
    if (clock >= SET_AT) return;
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
    root.classList.remove("intro-hold", "intro-on", "intro-live", "intro-name");
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
      load(P, IMG + (p.shot ? p.shot + (P.w * PR > 1000 ? "desktop-hero.webp" : "thumb.webp") :
        (P.wide ? "plates/" : "objects/") + p.object + ".svg"), printPlate);
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
        layoutPlates();
        /* From here the name is the reel's to hand over: its cell on the
           page stands in place rather than arriving with the other rows
           (intro-cut, which stays for good), and the page's own name waits
           unseen until the reel's has set into it (intro-name). */
        root.classList.add("intro-cut", "intro-name");
        frame = -1;
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
