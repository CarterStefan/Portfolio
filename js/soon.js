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

   This is a curtain, not a lock. GitHub Pages cannot ask for a password,
   the pages are still served, and the repository is public, so anyone who
   goes looking can read them. To launch, set SOON to false.

   Loaded in every page's <head> as a classic blocking script, ahead of
   anything that paints, so a page that is sending its visitor on never
   shows itself first.
   ========================================================================== */
(function () {
  "use strict";

  var SOON = true;

  var live = /(^|\.)stefancarter\.co\.uk$|\.github\.io$/.test(location.hostname);
  var preview = /[?&]soon\b/.test(location.search);
  if (!SOON || !(live || preview)) return;

  if (location.pathname !== "/" && location.pathname !== "/index.html") {
    location.replace(live ? "/" : "/?soon");
    return;
  }
  document.documentElement.classList.add("soon");
})();
