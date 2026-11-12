/* zenx portfolio the animated version */
(function () {
  "use strict";

  /* figure out how much this device can handle
     cpu memory and connection then a quick fps check
     sets the perf tier and a class on the html element */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORAGE_KEY = "zenx-perf-tier";
  var savedTier = null;
  try { savedTier = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  function detectTier() {
    if (reduceMotion) return "low";

    var score = 100;

    /* cpu cores */
    var cores = navigator.hardwareConcurrency || 4;
    if (cores <= 2) score -= 35;
    else if (cores <= 4) score -= 10;

    /* memory on chrome only */
    var mem = navigator.deviceMemory;
    if (mem !== undefined) {
      if (mem <= 1) score -= 40;
      else if (mem <= 2) score -= 25;
      else if (mem <= 4) score -= 8;
    }

    /* connection */
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      var t = conn.effectiveType;
      if (t === "slow-2g" || t === "2g") score -= 30;
      else if (t === "3g") score -= 15;
    }

    /* no hover usually means a phone */
    if (!window.matchMedia("(hover: hover)").matches) score -= 10;

    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  /* sample fps while the preloader runs */
  var fpsPromise = new Promise(function (resolve) {
    var frames = 0;
    var start = performance.now();
    function loop() {
      frames++;
      if (performance.now() - start < 900) {
        requestAnimationFrame(loop);
      } else {
        resolve(Math.round(frames / ((performance.now() - start) / 1000)));
      }
    }
    requestAnimationFrame(loop);
  });

  /* wait for the fps check then pick a tier */
  var tier = "high"; // assume high until the check finishes
  var autoTier = "high"; // what auto detection would pick if there was no saved setting
  var tierReady = fpsPromise.then(function (fps) {
    var base = detectTier();
    if (fps < 24) {
      autoTier = "low";
    } else if (fps < 45 || base === "low") {
      autoTier = base === "high" ? "medium" : base;
    } else {
      autoTier = base;
    }

    /* saved setting beats auto detection */
    if (savedTier === "low" || savedTier === "high") {
      tier = savedTier;
    } else {
      tier = autoTier;
    }

    applyTier(tier);
    return tier;
  });

  /* quick guess for code that runs before the fps check finishes */
  var syncTier = savedTier || detectTier();
  applyTier(syncTier);

  function applyTier(t) {
    document.documentElement.classList.remove("tier-low", "tier-medium", "tier-high");
    document.documentElement.classList.add("tier-" + t);
    window.__perfTier = t;
    syncTier = t;
    updatePerfButton(t);
  }

  function setTier(t) {
    applyTier(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch (e) {}
  }

  /* smooth scroll */
  var lenis = null;
  var scrollProgress = null;

  tierReady.then(function (t) {
    if (t === "high" && !reduceMotion && typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration: 1.2,
        easing: function (tt) { return Math.min(1, 1.001 - Math.pow(2, -10 * tt)); },
        smoothWheel: true,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      lenis.on("scroll", function () {
        if (scrollProgress) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          scrollProgress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
        }
      });

      window.addEventListener("resize", function () { lenis.resize(); });
    }
  });

  /* preloader */
  var preloader = document.getElementById("preloader");
  var preFill = document.getElementById("pre-fill");
  var preCount = document.getElementById("pre-count");
  var hero = document.querySelector(".hero");

  function dismissPreloader() {
    if (preloader) preloader.classList.add("done");
    document.body.classList.remove("is-loading");
    if (hero) hero.classList.add("in");
  }

  if (preloader) {
    tierReady.then(function (t) {
      var pct = 0;
      var step = t === "low" ? 40 : t === "medium" ? 22 : 10;
      var delay = t === "low" ? 30 : t === "medium" ? 55 : 80;

      var preTimer = setInterval(function () {
        pct += Math.random() * step + step * 0.4;
        if (pct >= 100) pct = 100;

        if (preFill) preFill.style.transform = "scaleX(" + (pct / 100) + ")";
        if (preCount) preCount.textContent = Math.round(pct) + "%";

        if (pct >= 100) {
          clearInterval(preTimer);
          var pause = t === "low" ? 50 : t === "medium" ? 180 : 300;
          setTimeout(dismissPreloader, pause);
        }
      }, delay);
    });
  } else {
    document.body.classList.remove("is-loading");
    if (hero) hero.classList.add("in");
  }

  /* scroll progress */
  scrollProgress = document.getElementById("progress");

  /* fallback for devices without smooth scroll */
  if (!lenis && scrollProgress) {
    window.addEventListener("scroll", function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
    }, { passive: true });
  }

  /* sticky header */
  var header = document.querySelector(".site-header");

  function onScrollHeader() {
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 8);
    }
  }

  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* cursor */
  tierReady.then(function (t) {
    if (t !== "high") return;

    var cursor = document.getElementById("cursor");
    if (!cursor || reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var cx = -100, cy = -100;
    var tx = -100, ty = -100;
    var cursorTicking = false;

    document.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!cursorTicking) {
        cursorTicking = true;
        requestAnimationFrame(moveCursor);
      }
    }, { passive: true });

    function moveCursor() {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      cursor.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      cursorTicking = false;
      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) {
        requestAnimationFrame(moveCursor);
        cursorTicking = true;
      }
    }

    document.addEventListener("mouseenter", function () { cursor.classList.add("is-active"); });
    document.addEventListener("mouseleave", function () { cursor.classList.remove("is-active"); });

    var hoverEls = document.querySelectorAll("a, button, .work-row[data-cursor]");
    for (var h = 0; h < hoverEls.length; h++) {
      hoverEls[h].addEventListener("mouseenter", function () {
        cursor.classList.add("is-hover");
        if (this.getAttribute("data-cursor") === "view") {
          cursor.classList.add("is-label");
        }
      });
      hoverEls[h].addEventListener("mouseleave", function () {
        cursor.classList.remove("is-hover");
        cursor.classList.remove("is-label");
      });
    }
  });

  /* split headings into word masks */
  var splitEls = Array.prototype.slice.call(document.querySelectorAll("[data-split]"));

  splitEls.forEach(function (el) {
    var text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) return;

    el.setAttribute("aria-label", text);

    var frag = document.createDocumentFragment();
    var words = text.split(" ");

    words.forEach(function (word, i) {
      var mask = document.createElement("span");
      mask.className = "w";
      mask.setAttribute("aria-hidden", "true");

      var inner = document.createElement("span");
      inner.className = "wi";
      inner.textContent = word;
      inner.style.setProperty("--i", i);

      mask.appendChild(inner);
      frag.appendChild(mask);

      if (i < words.length - 1) {
        frag.appendChild(document.createTextNode(" "));
      }
    });

    el.textContent = "";
    el.appendChild(frag);
  });

  /* split the connect link into letters */
  var linkLetters = document.getElementById("link-letters");

  if (linkLetters) {
    var raw = linkLetters.textContent.trim();
    linkLetters.textContent = "";
    for (var li = 0; li < raw.length; li++) {
      var span = document.createElement("span");
      span.className = "l";
      span.textContent = raw[li] === " " ? "\u00a0" : raw[li];
      span.style.setProperty("--i", li);
      linkLetters.appendChild(span);
    }
  }

  /* reveal on scroll */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  /* give each reveal a random direction so it feels less robotic */
  var revealTypes = ["from-left", "from-right", "from-below", "drop", "flip", "unfold"];
  revealEls.forEach(function (el, i) {
    /* skip stuff that already animates */
    if (el.classList.contains("name-card") || el.classList.contains("stats-card") ||
        el.classList.contains("tech-card") || el.classList.contains("marquee")) return;

    /* cycle through the directions */
    var type = revealTypes[i % revealTypes.length];
    el.classList.add(type);
  });

  if (!reduceMotion && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("revealed");
    });
  }

  /* stats counter */
  var statNums = Array.prototype.slice.call(document.querySelectorAll(".stat-num[data-count]"));

  if (statNums.length) {
    var statsObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statsObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(function (el) { statsObs.observe(el); });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";

    if (syncTier === "low") {
      el.textContent = target + suffix;
      return;
    }

    var duration = 1600;
    var start = performance.now();

    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* github sync */
  var GITHUB_USER = "zenformality";
  var CACHE_KEY = "zenx-github-cache";
  var CACHE_TTL = 3600000; /* one hour */

  function updateStat(id, value, suffix) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value + (suffix || "");
    el.setAttribute("data-count", value);
  }

  function applyGitHubData(data) {
    var profile = data.profile;
    var repos = data.repos;
    if (!profile || !repos) return;

    var totalStars = repos.reduce(function (sum, r) { return sum + (r.stargazers_count || 0); }, 0);
    var langSet = {};
    repos.forEach(function (r) {
      if (r.language) langSet[r.language] = true;
    });
    var langCount = Object.keys(langSet).length;

    updateStat("stat-stars", totalStars, "+");
    updateStat("stat-repos", profile.public_repos);
    updateStat("stat-langs", langCount);

    /* rerun the counters if they are on screen */
    ["stat-stars", "stat-repos", "stat-langs"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      animateCount(el);
    });

    /* add icons for languages found on github */
    var logoMap = {
      "Python": "python",
      "TypeScript": "typescript",
      "JavaScript": "javascript",
      "Go": "go",
      "Dart": "dart",
      "Java": "java",
      "Ruby": "ruby",
      "PHP": "php",
      "C++": "cpp",
      "C": "c",
      "Rust": "rust",
      "Swift": "swift",
      "Kotlin": "kotlin",
      "R": "r",
      "Scala": "scala",
      "Perl": "perl",
      "Haskell": "haskell",
      "Elixir": "elixir",
      "Clojure": "clojure",
      "Lua": "lua",
      "Shell": "shell",
      "Dockerfile": "docker",
      "Makefile": "terminal",
      "HTML": "html5",
      "CSS": "css3",
      "Svelte": "svelte",
      "Vue": "vue",
      "Django": "django",
      "Flutter": "flutter",
      "Firebase": "firebase",
      "Tailwind CSS": "tailwindcss",
      "Git": "git"
    };

    var existingIcons = document.querySelectorAll(".tech-logos i");
    var existingTitles = [];
    existingIcons.forEach(function (ic) { existingTitles.push(ic.getAttribute("title")); });

    repos.forEach(function (r) {
      if (!r.language) return;
      var devicon = logoMap[r.language];
      if (!devicon) return;
      var already = existingTitles.indexOf(r.language) !== -1;
      if (already) return;

      var icon = document.createElement("i");
      icon.className = "devicon-" + devicon + "-plain";
      icon.title = r.language;
      document.querySelector(".tech-logos").appendChild(icon);
      existingTitles.push(r.language);
    });
  }

  function fetchGitHubData() {
    var cached = null;
    var cachedTs = null;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        cached = JSON.parse(raw);
        if (Date.now() - cached.ts > CACHE_TTL) cached = null;
        else cachedTs = cached.ts;
      }
    } catch (e) { cached = null; }

    if (cached) {
      applyGitHubData(cached.data);
      var syncEl = document.getElementById("footer-sync");
      if (syncEl) {
        var ago = Math.round((Date.now() - cachedTs) / 60000);
        syncEl.textContent = ago < 60 ? "synced " + ago + "m ago" : "synced " + Math.round(ago / 60) + "h ago";
      }
      return;
    }

    var profileUrl = "https://api.github.com/users/" + GITHUB_USER;
    var reposUrl = "https://api.github.com/users/" + GITHUB_USER + "/repos?sort=updated&per_page=100";

    var fetchTs = Date.now();

    Promise.all([
      fetch(profileUrl).then(function (r) { return r.json(); }),
      fetch(reposUrl).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var profile = results[0];
      var repos = results[1];

      if (!profile || profile.message) return;
      if (!Array.isArray(repos)) repos = [];

      var data = { profile: profile, repos: repos };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: fetchTs, data: data }));
      } catch (e) {}

      applyGitHubData(data);

      var syncEl = document.getElementById("footer-sync");
      if (syncEl) syncEl.textContent = "synced just now";
    }).catch(function () {
      /* if this fails the hardcoded numbers stay */
    });
  }

  fetchGitHubData();

  /* sticky word carousel */
  var stage = document.querySelector(".sticky-stage");
  var track = document.getElementById("swap-track");
  var dots = Array.prototype.slice.call(document.querySelectorAll("#swap-dots .dot"));

  if (stage && track) {
    var swapItems = Array.prototype.slice.call(track.querySelectorAll("span"));
    var swapCount = swapItems.length;
    var swapCurrent = -1;
    var swapTicking = false;

    function updateSwap() {
      swapTicking = false;

      var rect = stage.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var progress = total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;
      var idx = Math.min(swapCount - 1, Math.floor(progress * swapCount));

      if (idx !== swapCurrent) {
        swapCurrent = idx;

        if (reduceMotion || syncTier === "low") {
          track.style.transition = "none";
        }
        track.style.transform = "translateY(-" + (idx * 1.05) + "em)";

        dots.forEach(function (dot, i) {
          dot.classList.toggle("on", i === idx);
        });
      }
    }

    function requestSwapUpdate() {
      if (!swapTicking) {
        swapTicking = true;
        window.requestAnimationFrame(updateSwap);
      }
    }

    window.addEventListener("scroll", requestSwapUpdate, { passive: true });
    window.addEventListener("resize", requestSwapUpdate);
    updateSwap();
  }

  /* dot grid for high tier only */
  tierReady.then(function (t) {
    if (t !== "high") return;

    var canvas = document.getElementById("dots");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var dotsGrid = [];
    var dotSpacing = 36;
    var dotRadius = 1.2;
    var canvasTicking = false;
    var mouseX = -1000, mouseY = -1000;

    function resizeCanvas() {
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    }

    function buildDots() {
      dotsGrid = [];
      var w = canvas.parentElement.offsetWidth;
      var h = canvas.parentElement.offsetHeight;
      for (var x = dotSpacing / 2; x < w; x += dotSpacing) {
        for (var y = dotSpacing / 2; y < h; y += dotSpacing) {
          dotsGrid.push({ x: x, y: y, baseX: x, baseY: y });
        }
      }
    }

    function drawDots() {
      canvasTicking = false;
      var w = canvas.parentElement.offsetWidth;
      var h = canvas.parentElement.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < dotsGrid.length; i++) {
        var d = dotsGrid[i];
        var dx = d.x - mouseX;
        var dy = d.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 160;

        if (dist < maxDist) {
          var force = (1 - dist / maxDist) * 18;
          d.x = d.baseX + (dx / dist) * force;
          d.y = d.baseY + (dy / dist) * force;
        } else {
          d.x += (d.baseX - d.x) * 0.08;
          d.y += (d.baseY - d.y) * 0.08;
        }

        var opacity = dist < maxDist ? 0.25 + (1 - dist / maxDist) * 0.35 : 0.12;
        ctx.beginPath();
        ctx.arc(d.x, d.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,211,238," + opacity.toFixed(2) + ")";
        ctx.fill();
      }
    }

    canvas.parentElement.addEventListener("mousemove", function (e) {
      var rect = canvas.parentElement.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      if (!canvasTicking) {
        canvasTicking = true;
        requestAnimationFrame(drawDots);
      }
    }, { passive: true });

    canvas.parentElement.addEventListener("mouseleave", function () {
      mouseX = -1000;
      mouseY = -1000;
      if (!canvasTicking) {
        canvasTicking = true;
        requestAnimationFrame(drawDots);
      }
    });

    window.addEventListener("resize", function () {
      if (!canvasTicking) {
        canvasTicking = true;
        requestAnimationFrame(function () {
          resizeCanvas();
          canvasTicking = false;
        });
      }
    });

    resizeCanvas();
  });

  /* orb parallax for high tier only */
  tierReady.then(function (t) {
    if (t !== "high" || reduceMotion) return;

    var orbs = Array.prototype.slice.call(document.querySelectorAll(".orb[data-speed]"));
    if (!orbs.length) return;

    var pTicking = false;

    function applyParallax() {
      pTicking = false;
      var y = window.scrollY;

      orbs.forEach(function (orb) {
        var speed = parseFloat(orb.getAttribute("data-speed")) || 0;
        orb.style.transform = "translate3d(0," + (y * speed).toFixed(1) + "px,0)";
      });
    }

    function requestParallax() {
      if (!pTicking) {
        pTicking = true;
        window.requestAnimationFrame(applyParallax);
      }
    }

    window.addEventListener("scroll", requestParallax, { passive: true });
    applyParallax();
  });

  /* magnetic buttons */
  tierReady.then(function (t) {
    if (t === "low" || reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var magnets = Array.prototype.slice.call(document.querySelectorAll(".btn-magnetic"));
    magnets.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * 0.25).toFixed(1) + "px," + (y * 0.25).toFixed(1) + "px)";
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  });

  /* back to top */
  var toTop = document.getElementById("to-top");

  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("visible", window.scrollY > 500);
    }, { passive: true });

    toTop.addEventListener("click", function () {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  /* perf toggle */
  var perfBtn = document.getElementById("perf-toggle");

  function updatePerfButton(t) {
    if (!perfBtn) return;
    perfBtn.classList.toggle("is-low", t === "low");
    perfBtn.setAttribute("aria-label",
      t === "low" ? "Switch to full experience" : "Switch to lightweight mode"
    );
  }

  if (perfBtn) {
    window.addEventListener("scroll", function () {
      perfBtn.classList.toggle("visible", window.scrollY > 300);
    }, { passive: true });

    perfBtn.addEventListener("click", function () {
      var next = window.__perfTier === "low" ? autoTier : "low";
      setTier(next);

      /* turn smooth scroll on or off */
      if (next === "high" && !reduceMotion && !lenis && typeof Lenis !== "undefined") {
        lenis = new Lenis({
          duration: 1.2,
          easing: function (tt) { return Math.min(1, 1.001 - Math.pow(2, -10 * tt)); },
          smoothWheel: true,
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        lenis.on("scroll", function () {
          if (scrollProgress) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            scrollProgress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
          }
        });
        window.addEventListener("resize", function () { lenis.resize(); });
      } else if (next !== "high" && lenis) {
        lenis.destroy();
        lenis = null;
      }
    });
  }

  /* tilt effect */
  tierReady.then(function (t) {
    if (t === "low" || reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var tiltEls = Array.prototype.slice.call(document.querySelectorAll("[data-tilt]"));
    tiltEls.forEach(function (el) {
      var baseRotation = 0;
      var baseTransform = window.getComputedStyle(el).transform;

      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = ((y - centerY) / centerY) * -3;
        var rotateY = ((x - centerX) / centerX) * 3;

        el.style.transform = "perspective(600px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) scale(1.015)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  });

  /* magnetic buttons */
  tierReady.then(function (t) {
    if (t === "low" || reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var magnets = Array.prototype.slice.call(document.querySelectorAll(".btn-magnetic"));
    magnets.forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * 0.3).toFixed(1) + "px," + (y * 0.3).toFixed(1) + "px)";
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  });

  /* sticker stamp */
  var stickers = Array.prototype.slice.call(document.querySelectorAll(".sticker"));
  stickers.forEach(function (sticker) {
    sticker.addEventListener("mouseenter", function () {
      sticker.style.transform = "rotate(-8deg) scale(1.2)";
    });
    sticker.addEventListener("mouseleave", function () {
      sticker.style.transform = "";
    });
  });

  /* hero card parallax */
  tierReady.then(function (t) {
    if (t === "low" || reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var hero = document.querySelector(".hero");
    var nameCard = document.querySelector(".name-card");
    var statsCard = document.querySelector(".stats-card");
    var techCard = document.querySelector(".tech-card");

    if (!hero || !nameCard) return;

    var rafId = null;

    hero.addEventListener("mousemove", function (e) {
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        var rect = hero.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;

        if (nameCard) nameCard.style.transform = "rotate(" + (-1.5 + x * 3).toFixed(1) + "deg) translate(" + (x * 8).toFixed(1) + "px," + (y * 6).toFixed(1) + "px)";
        if (statsCard) statsCard.style.transform = "rotate(" + (2.5 - x * 3).toFixed(1) + "deg) translate(" + (-x * 8).toFixed(1) + "px," + (-y * 6).toFixed(1) + "px)";
        if (techCard) techCard.style.transform = "rotate(" + (-2 + x * 2).toFixed(1) + "deg) translate(" + (x * 6).toFixed(1) + "px," + (y * 5).toFixed(1) + "px)";

        rafId = null;
      });
    });

    hero.addEventListener("mouseleave", function () {
      if (nameCard) nameCard.style.transform = "";
      if (statsCard) statsCard.style.transform = "";
      if (techCard) techCard.style.transform = "";
    });
  });

  /* konami code */
  var konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  var konamiIndex = 0;

  document.addEventListener("keydown", function (e) {
    if (e.keyCode === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        document.body.style.transform = "rotate(360deg)";
        document.body.style.transition = "transform 1s ease";
        setTimeout(function () {
          document.body.style.transform = "";
          document.body.style.transition = "";
        }, 1000);
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  /* preview tooltip */
  tierReady.then(function () {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var tooltip = document.getElementById("preview-tooltip");
    var tooltipImg = tooltip ? tooltip.querySelector(".preview-image") : null;
    var tooltipUrl = tooltip ? tooltip.querySelector(".preview-url") : null;
    var tooltipLoading = tooltip ? tooltip.querySelector(".preview-loading") : null;
    var previewItems = Array.prototype.slice.call(document.querySelectorAll("[data-preview-img]"));
    var hideTimeout = null;
    var currentImg = null;
    var imageCache = {};

    if (!tooltip || !previewItems.length) return;

    /* preload preview images */
    previewItems.forEach(function (item) {
      var imgSrc = item.getAttribute("data-preview-img");
      if (imgSrc && !imageCache[imgSrc]) {
        var img = new Image();
        img.src = imgSrc;
        imageCache[imgSrc] = img;
      }
    });

    previewItems.forEach(function (item) {
      item.addEventListener("mouseenter", function (e) {
        var imgSrc = item.getAttribute("data-preview-img");
        var url = item.getAttribute("data-preview");
        if (!imgSrc) return;

        clearTimeout(hideTimeout);

        /* keep the tooltip near the cursor */
        var x = e.clientX + 20;
        var y = e.clientY - 120;

        /* dont let it leave the screen */
        if (x + 380 > window.innerWidth) x = e.clientX - 400;
        if (y < 20) y = 20;
        if (y + 260 > window.innerHeight) y = window.innerHeight - 270;

        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";

        /* show the loader */
        if (tooltipLoading) tooltipLoading.classList.remove("hidden");
        if (tooltipImg) tooltipImg.classList.remove("loaded");

        /* only swap if the image changed */
        if (currentImg !== imgSrc && tooltipImg) {
          tooltipImg.src = imgSrc;
          currentImg = imgSrc;

          /* hide the loader when the image is ready */
          tooltipImg.onload = function () {
            if (tooltipLoading) tooltipLoading.classList.add("hidden");
            tooltipImg.classList.add("loaded");
          };

          /* already cached */
          if (imageCache[imgSrc] && imageCache[imgSrc].complete) {
            if (tooltipLoading) tooltipLoading.classList.add("hidden");
            tooltipImg.classList.add("loaded");
          }
        } else if (tooltipImg) {
          /* same image as before */
          if (tooltipLoading) tooltipLoading.classList.add("hidden");
          tooltipImg.classList.add("loaded");
        }

        if (tooltipUrl && url) {
          try {
            var hostname = new URL(url).hostname;
            tooltipUrl.textContent = hostname;
          } catch (err) {
            tooltipUrl.textContent = url;
          }
        }

        tooltip.classList.add("active");
      });

      item.addEventListener("mousemove", function (e) {
        if (!tooltip.classList.contains("active")) return;

        var x = e.clientX + 20;
        var y = e.clientY - 120;

        if (x + 380 > window.innerWidth) x = e.clientX - 400;
        if (y < 20) y = 20;
        if (y + 260 > window.innerHeight) y = window.innerHeight - 270;

        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
      });

      item.addEventListener("mouseleave", function () {
        hideTimeout = setTimeout(function () {
          tooltip.classList.remove("active");
        }, 150);
      });
    });

    /* dont hide it while the cursor is over it */
    tooltip.addEventListener("mouseenter", function () {
      clearTimeout(hideTimeout);
    });

    tooltip.addEventListener("mouseleave", function () {
      tooltip.classList.remove("active");
    });
  });
})();
