/* RR-045 · restorhythm.com static-site enhancements.
 *
 * Zero-dependency progressive enhancement for the prerendered
 * marketing pages:
 *   1. Mobile navigation (the React menu was client-rendered, so the
 *      static markup builds it on demand).
 *   2. Smooth anchor scrolling for in-page links.
 *   3. Demo request form — posts to the EXISTING application API on
 *      app.restorhythm.com (CORS already allows restorhythm.com).
 * Nothing here touches authentication or application state.
 */
(function () {
  "use strict";

  var APP = "https://app.restorhythm.com";

  /* ------------------------------------------------ mobile nav --- */
  var NAV_ITEMS = [
    { href: "/#products", label: "Products" },
    { href: "/#roadmap", label: "Roadmap" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#story", label: "Story" },
  ];

  function buildMobileMenu() {
    var toggle = document.querySelector('[data-testid="nav-mobile-toggle"]');
    if (!toggle) return;
    var header = toggle.closest("header");
    var container = header && header.querySelector(".mx-auto");
    if (!container) return;

    var menu = document.createElement("div");
    menu.id = "rr-mobile-menu";
    menu.style.display = "none";
    menu.style.borderTop = "1px solid var(--line)";
    menu.style.padding = "12px 0 16px";

    NAV_ITEMS.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      a.style.display = "block";
      a.style.padding = "10px 0";
      a.style.fontSize = "14px";
      a.style.color = "inherit";
      a.style.textDecoration = "none";
      a.addEventListener("click", function () {
        menu.style.display = "none";
      });
      menu.appendChild(a);
    });

    var actions = document.createElement("div");
    actions.style.cssText = "margin-top:12px;display:flex;flex-direction:column;gap:8px";

    var signin = document.createElement("a");
    signin.href = APP + "/login";
    signin.textContent = "Sign in";
    signin.style.cssText =
      "padding:10px 16px;font-size:14px;border:1px solid var(--line);text-decoration:none;color:inherit;text-align:center";

    var demo = document.createElement("a");
    demo.href = "/#demo";
    demo.textContent = "Book a demo";
    demo.className = "btn-primary-rr";
    demo.style.cssText = "padding:10px 16px;font-size:14px;text-align:center;text-decoration:none";
    demo.addEventListener("click", function () {
      menu.style.display = "none";
    });

    actions.appendChild(signin);
    actions.appendChild(demo);
    menu.appendChild(actions);
    container.appendChild(menu);

    toggle.addEventListener("click", function () {
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    });
  }

  /* --------------------------------------------- smooth scroll --- */
  function smoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"], a[href^="/#"]');
      if (!a) return;
      var href = a.getAttribute("href");
      var hash = href.indexOf("#") >= 0 ? href.slice(href.indexOf("#")) : null;
      if (!hash || hash === "#") return;
      // "/#x" on a page without that id = link back to the homepage.
      if (href.charAt(0) === "/" && !document.getElementById(hash.slice(1))) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ----------------------------------------- apps menu (static) --- */
  function wireAppsMenu() {
    // The desktop "Apps" dropdown was a React component; on the static
    // site it becomes a simple jump to the products section.
    var trigger = document.querySelector('[data-testid="nav-menu-apps"]');
    if (!trigger) return;
    trigger.addEventListener("click", function () {
      var target = document.getElementById("products");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.href = "/#products";
      }
    });
  }

  /* ------------------------------------------------- demo form --- */
  function wireDemoForm() {
    var form = document.querySelector('[data-testid="demo-form"]');
    if (!form) return;

    var teamSize = "20–50";
    var products = [];

    form.querySelectorAll('[data-testid^="demo-team-"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        teamSize = btn.textContent.trim();
        form.querySelectorAll('[data-testid^="demo-team-"]').forEach(function (b) {
          var on = b === btn;
          b.style.background = on ? "var(--ink)" : "";
          b.style.color = on ? "#fff" : "";
          b.style.borderColor = on ? "var(--ink)" : "var(--line)";
        });
      });
    });

    form.querySelectorAll('[data-testid^="demo-product-"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var slug = btn.getAttribute("data-testid").replace("demo-product-", "");
        var i = products.indexOf(slug);
        if (i >= 0) products.splice(i, 1); else products.push(slug);
        var on = products.indexOf(slug) >= 0;
        btn.style.borderColor = on ? "var(--accent)" : "var(--line)";
        btn.style.color = on ? "var(--accent)" : "";
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = form.querySelector('[data-testid="' + id + '"]');
        return el ? el.value.trim() : "";
      };
      var submitBtn = form.querySelector('[data-testid="demo-submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      fetch(APP + "/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: val("demo-input-name"),
          email: val("demo-input-email"),
          restaurant_name: val("demo-input-restaurant"),
          phone: val("demo-input-phone"),
          team_size: teamSize,
          products_interested: products,
          message: val("demo-input-message"),
        }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("request failed");
          var name = val("demo-input-name").split(" ")[0] || "there";
          var restaurant = val("demo-input-restaurant");
          form.outerHTML =
            '<div class="border border-[color:var(--line)] p-10 bg-white" data-testid="demo-form-success">' +
            '<h3 class="mt-4 font-display font-extrabold text-2xl tracking-tighter">Thanks, ' +
            name.replace(/[<>&]/g, "") + ".</h3>" +
            '<p class="mt-2 text-[color:var(--muted)]" style="max-width:28rem">We received your demo request for <strong>' +
            restaurant.replace(/[<>&]/g, "") +
            "</strong>. A member of our team will reach out within one business day.</p></div>";
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Request a demo";
          alert("Something went wrong sending your request — please try again.");
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      buildMobileMenu();
      smoothScroll();
      wireAppsMenu();
      wireDemoForm();
    });
  } else {
    buildMobileMenu();
    smoothScroll();
    wireAppsMenu();
    wireDemoForm();
  }
})();
