(function(){
  "use strict";

  /* Loading splash — shown once per browser session while the brand mark forms.
     Percentage counts up to 100 over the full splash duration using elapsed-time
     based setTimeout polling (not requestAnimationFrame, which browsers throttle
     or pause in backgrounded/unfocused tabs). */
  var loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    if (sessionStorage.getItem("xsus-splash-seen")) {
      loadingScreen.classList.add("is-hidden");
    } else {
      sessionStorage.setItem("xsus-splash-seen", "1");
      var loadingPercent = document.getElementById("loadingPercent");
      window.addEventListener("load", function () {
        var duration = 4500;
        var startTime = Date.now();
        var tick = function () {
          var pct = Math.min(100, Math.round(((Date.now() - startTime) / duration) * 100));
          if (loadingPercent) loadingPercent.textContent = pct + "%";
          if (pct < 100) {
            setTimeout(tick, 30);
          } else {
            setTimeout(function () {
              loadingScreen.classList.add("is-hidden");
            }, 400);
          }
        };
        tick();
      });
    }
  }

  /* Full-screen nav overlay toggle */
  var toggle = document.getElementById("navToggle");
  var overlay = document.getElementById("navOverlay");
  if (toggle && overlay) {
    toggle.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
    overlay.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
      });
    });
  }

  /* Detail modals — opened from nav links, hero buttons, slider links, topic cards, footer */
  var modalLastFocused = null;

  function openModal(id) {
    var modal = document.getElementById("modal-" + id);
    if (!modal) return;
    document.querySelectorAll(".detail-modal.active").forEach(function (m) {
      m.classList.remove("active");
    });
    document.body.classList.remove("nav-open");
    modalLastFocused = document.activeElement;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    var closeBtn = modal.querySelector(".detail-modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    var active = document.querySelector(".detail-modal.active");
    if (!active) return;
    active.classList.remove("active");
    document.body.classList.remove("modal-open");
    if (modalLastFocused && typeof modalLastFocused.focus === "function") {
      modalLastFocused.focus();
    }
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-modal]");
    if (trigger) {
      e.preventDefault();
      openModal(trigger.getAttribute("data-modal"));
      return;
    }
    if (e.target.closest("[data-modal-close]")) {
      e.preventDefault();
      closeModal();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  /* Custom cursor — hand-drawn arrow with sparkle on hover/click */
  var cursor = document.getElementById("cursorDot");
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (cursor && canHover) {
    window.addEventListener("mousemove", function (e) {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    });
    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("hovering"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("hovering"); });
    });
    window.addEventListener("mousedown", function () { cursor.classList.add("clicking"); });
    window.addEventListener("mouseup", function () { cursor.classList.remove("clicking"); });
  }

  /* Scroll reveal */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* Staggered hero line reveal */
  document.querySelectorAll(".hero-title .line").forEach(function (line, i) {
    line.style.transitionDelay = (i * 0.12) + "s";
  });

  /* Intro slideshow — auto-advances every 8s, pauses while tab hidden */
  var slides = document.querySelectorAll("#sliderStage .slide");
  var dots = document.querySelectorAll("#slideDots li");
  var counterCurrent = document.getElementById("slideCounterCurrent");
  var slideInterval = 10000;
  var slideIndex = 0;
  var slideTimer = null;

  function goToSlide(i) {
    if (!slides.length) return;
    slideIndex = (i + slides.length) % slides.length;
    slides.forEach(function (s, idx) { s.classList.toggle("active", idx === slideIndex); });
    dots.forEach(function (d, idx) { d.classList.toggle("active", idx === slideIndex); });
    if (counterCurrent) counterCurrent.textContent = String(slideIndex + 1).padStart(2, "0");
  }

  function startAutoplay() {
    stopAutoplay();
    slideTimer = setInterval(function () { goToSlide(slideIndex + 1); }, slideInterval);
  }

  function stopAutoplay() {
    if (slideTimer) clearInterval(slideTimer);
  }

  if (slides.length) {
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        goToSlide(i);
        startAutoplay();
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoplay();
      } else if (
        verticalPages.length &&
        !topicsActive &&
        verticalPages[currentPageIndex] &&
        verticalPages[currentPageIndex].id === "introSlider"
      ) {
        startAutoplay();
      }
    });
    goToSlide(0);
  }

  /* Full-screen pagination — replaces scrolling with proximity-triggered flips.
     Hero / intro slideshow / footer flip vertically. Topics branches off the
     intro slideshow horizontally (flip right to open, left to return). */
  var verticalPages = Array.from(document.querySelectorAll(".page-vertical"));
  var topicsPage = document.getElementById("topics");
  var currentPageIndex = 0;
  var topicsActive = false;

  function updatePages() {
    verticalPages.forEach(function (page, i) {
      page.style.transform = "translateY(" + (i - currentPageIndex) * 100 + "%)";
      page.classList.toggle("is-active", i === currentPageIndex && !topicsActive);
    });
    if (topicsPage) {
      topicsPage.style.transform = "translateX(" + (topicsActive ? 0 : 100) + "%)";
      topicsPage.classList.toggle("is-active", topicsActive);
    }
  }

  function goToPage(index) {
    if (topicsActive || index < 0 || index >= verticalPages.length || index === currentPageIndex) return;
    currentPageIndex = index;
    updatePages();
    if (verticalPages[currentPageIndex].id === "introSlider") {
      goToSlide(0);
      startAutoplay();
    } else {
      stopAutoplay();
    }
  }

  function openTopics() {
    if (topicsActive || !verticalPages[currentPageIndex] || verticalPages[currentPageIndex].id !== "introSlider") return;
    topicsActive = true;
    stopAutoplay();
    updatePages();
  }

  function closeTopics() {
    if (!topicsActive) return;
    topicsActive = false;
    updatePages();
    if (verticalPages[currentPageIndex] && verticalPages[currentPageIndex].id === "introSlider") startAutoplay();
  }

  function runFlip(dir) {
    if (dir === "right") openTopics();
    else if (dir === "left") closeTopics();
    else goToPage(currentPageIndex + (dir === "next" ? 1 : -1));
  }

  if (verticalPages.length) {
    updatePages();

    document.querySelectorAll(".flip-arrow").forEach(function (arrow) {
      arrow.addEventListener("click", function () {
        runFlip(arrow.getAttribute("data-flip"));
      });
    });

    document.addEventListener("keydown", function (e) {
      if (document.querySelector(".detail-modal.active") || document.body.classList.contains("nav-open")) return;
      if (topicsActive) {
        if (e.key === "ArrowLeft") { e.preventDefault(); closeTopics(); }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(currentPageIndex + 1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPageIndex - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        openTopics();
      }
    });

    if (canHover) {
      var holdDuration = 550;
      var hoverRadius = 110;
      var activeArrow = null;
      var holdTimeout = null;

      var cancelHold = function () {
        if (holdTimeout) clearTimeout(holdTimeout);
        holdTimeout = null;
        if (activeArrow) activeArrow.classList.remove("is-charging");
        activeArrow = null;
      };

      var startHold = function (arrow) {
        activeArrow = arrow;
        arrow.classList.add("is-charging");
        holdTimeout = setTimeout(function () {
          var dir = arrow.getAttribute("data-flip");
          cancelHold();
          runFlip(dir);
        }, holdDuration);
      };

      window.addEventListener("mousemove", function (e) {
        if (document.querySelector(".detail-modal.active") || document.body.classList.contains("nav-open")) {
          if (activeArrow) cancelHold();
          return;
        }
        var activePage = topicsActive ? topicsPage : verticalPages[currentPageIndex];
        var arrows = activePage ? activePage.querySelectorAll(".flip-arrow") : [];
        var found = null;
        arrows.forEach(function (arrow) {
          var r = arrow.getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var cy = r.top + r.height / 2;
          if (Math.hypot(e.clientX - cx, e.clientY - cy) < hoverRadius) found = arrow;
        });
        if (found && found !== activeArrow) {
          cancelHold();
          startHold(found);
        } else if (!found && activeArrow) {
          cancelHold();
        }
      });
    }
  }
})();
