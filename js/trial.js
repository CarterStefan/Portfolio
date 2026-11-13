/* Design trial switcher (styles.css section 25). Applies the classes that
   turn the trial's two moves off, from a choice remembered in this
   browser, before the first paint. The switcher itself only shows on a
   local server, so a visitor to the live site always sees the defaults.
   Delete this file and its <script> tags once the trial is settled. */
(function (root) {
  var KEY = "sc-trial";
  var OPTIONS = {
    paper: ["gray", "stone", "warm", "white"],
    rail: ["slim", "none", "full"],
    prints: ["halftone", "engraved"],
    portrait: ["fine", "engraved"]
  };
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!local) return;

  var state = { paper: "stone", rail: "slim", prints: "halftone", portrait: "fine" };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    Object.keys(OPTIONS).forEach(function (k) {
      if (OPTIONS[k].indexOf(saved[k]) !== -1) state[k] = saved[k];
    });
  } catch (e) {}

  function apply() {
    root.classList.toggle("paper-white", state.paper === "white");
    root.classList.toggle("paper-gray", state.paper === "gray");
    root.classList.toggle("paper-stone", state.paper === "stone");
    root.classList.toggle("prints-engraved", state.prints === "engraved");
    root.classList.toggle("portrait-engraved", state.portrait === "engraved");
    root.classList.toggle("rail-none", state.rail === "none");
    root.classList.toggle("rail-full", state.rail === "full");
  }
  apply();

  function build() {
    var panel = document.createElement("div");
    panel.setAttribute("aria-label", "Design trial");
    panel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2000;display:flex;flex-wrap:wrap;max-width:calc(100vw - 24px);gap:10px;" +
      "padding:8px 10px;background:#161513;color:#F4F2EC;font:11px/1.2 'Space Mono',monospace;" +
      "text-transform:uppercase;letter-spacing:.04em";
    Object.keys(OPTIONS).forEach(function (k) {
      var group = document.createElement("div");
      group.style.cssText = "display:flex;gap:4px;align-items:center";
      group.appendChild(document.createTextNode(k + ":"));
      OPTIONS[k].forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = v;
        b.style.cssText = "font:inherit;text-transform:inherit;letter-spacing:inherit;cursor:pointer;" +
          "padding:3px 6px;border:1px solid #F4F2EC;" +
          (state[k] === v ? "background:#F4F2EC;color:#161513" : "background:none;color:#F4F2EC");
        b.addEventListener("click", function () {
          state[k] = v;
          try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
          /* Reload rather than restyle, so the engraved prints are cut again
             on the paper they will sit on */
          location.reload();
        });
        group.appendChild(b);
      });
      panel.appendChild(group);
    });
    document.body.appendChild(panel);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})(document.documentElement);
