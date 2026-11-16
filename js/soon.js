/* ==========================================================================
   STEFAN CARTER | COMING SOON
   While the site is being finished, the live site is Home alone: the reel,
   then the name, the practice and the portrait, with no nav and no links,
   closing on a band that says the website is coming soon (styles.css
   section 23). Every other page sends its visitor straight to Home before
   it draws, so an old link or a search result lands there too.

   It only switches on at the live address. Anywhere else, your own machine
   included, the whole site works as normal, and ?soon on any page shows
   you what visitors see.

   A preview code opens the full site in one browser. Type it into the box
   on the band, or add ?code=... to any address (handy as a link to send).
   The browser then remembers it, so the curtain stays open on later
   visits. ?lock closes it again. Only a hash of the code is stored here,
   so the code itself is not in the repository.

   This is a curtain, not a lock. GitHub Pages cannot ask for a password,
   the pages are still served, and the repository is public, so anyone who
   goes looking can read them. To launch, set SOON to false.

   To change the code, set CODE_HASH to the SHA-256 hex of "sc:" followed
   by the new code in lower case, e.g.
     node -e "console.log(require('crypto').createHash('sha256').update('sc:'+'newcode').digest('hex'))"
   Changing it closes the curtain again in every browser that had it open.

   Loaded in every page's <head> as a classic blocking script, ahead of
   anything that paints, so a page that is sending its visitor on never
   shows itself first.
   ========================================================================== */
(function () {
  "use strict";

  var SOON = true;
  var CODE_HASH = "dc1ed93b5b5a710404e30b211a6060e754038a3655ca43a735b5f98f0976d474";
  var KEY = "sc-preview";

  if (!SOON) return;

  var live = /(^|\.)stefancarter\.co\.uk$|\.github\.io$/.test(location.hostname);
  var params = new URLSearchParams(location.search);
  var preview = params.has("soon");

  function store(value) {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch (e) { /* storage blocked: the code just will not be remembered */ }
  }

  function isOpen() {
    try { return localStorage.getItem(KEY) === CODE_HASH; } catch (e) { return false; }
  }

  /* Resolves true when the code matches, and remembers it */
  function tryCode(code) {
    var text = "sc:" + String(code).trim().toLowerCase();
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve(false);
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      if (hex !== CODE_HASH) return false;
      store(CODE_HASH);
      return true;
    }, function () { return false; });
  }

  /* The same address without the code, ?soon or ?lock */
  function cleanUrl() {
    params.delete("code");
    params.delete("soon");
    params.delete("lock");
    var q = params.toString();
    return location.pathname + (q ? "?" + q : "") + location.hash;
  }

  if (params.has("lock")) store(null);

  if (!(live || preview)) return;

  /* A code in the address: hold the page back while it is checked, then
     either open the page asked for or fall back to Home like any visitor */
  if (params.has("code")) {
    document.documentElement.style.visibility = "hidden";
    tryCode(params.get("code")).then(function (ok) {
      location.replace(ok ? cleanUrl() : (live ? "/" : "/?soon"));
    });
    return;
  }

  /* ?soon still shows the curtain locally, open or not, so it can be checked */
  if (isOpen() && !preview) return;

  if (location.pathname !== "/" && location.pathname !== "/index.html") {
    location.replace(live ? "/" : "/?soon");
    return;
  }
  document.documentElement.classList.add("soon");

  /* The code box on Home's band */
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("soon-code");
    if (!form) return;
    var input = form.querySelector("input");
    var msg = form.querySelector(".soon-code-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!input.value.trim()) return;
      tryCode(input.value).then(function (ok) {
        if (ok) {
          location.replace("/");
        } else {
          msg.textContent = "That code didn’t work.";
          input.select();
        }
      });
    });
  });
})();
