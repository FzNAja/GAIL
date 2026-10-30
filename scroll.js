(() => {
  const bar = document.querySelector(".nav .w");
  if (bar && !bar.querySelector(".nol-nav")) {
    const nav = document.createElement("nav");
    nav.className = "nol-nav";
    nav.setAttribute("aria-label", "Bagian");
    bar.querySelectorAll(".l").forEach((button) => nav.appendChild(button));
    const label = document.createElement("p");
    label.id = "sec";
    label.className = "sec-label";
    label.textContent = "Awal";
    const anchor = document.getElementById("me");
    bar.insertBefore(nav, anchor);
    bar.insertBefore(label, nav);
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.16 },
  );

  window.nolReveal = (el) => {
    if (reduce) el.classList.add("in");
    else seen.observe(el);
  };

  document.querySelectorAll(".rv:not(.in)").forEach((el) => window.nolReveal(el));
})();
