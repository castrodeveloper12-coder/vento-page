// Movimiento de Vueltito, con criterios de Apple:
// - Las cosas aparecen al bajar, subiendo un poco y con una curva tipo resorte sin rebote.
// - Dentro de un grupo (tarjetas, preguntas) aparecen en cascada, con poco retraso.
// - La barra de arriba muestra su borde solo cuando hay contenido pasando por debajo.
// - Si el teléfono pide menos movimiento, no se mueve nada: solo aparece.
// - Sin JavaScript todo se ve igual, sin esconder nada.
(function () {
  var raiz = document.documentElement;
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Barra de arriba: borde y sombra solo después de bajar
  var barra = document.querySelector(".topbar");
  if (barra) {
    var marcar = function () {
      barra.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    marcar();
    window.addEventListener("scroll", marcar, { passive: true });
  }

  if (reducir || !("IntersectionObserver" in window)) return;

  var grupos = [
    "main section h2", "main section > .wrap > .sub",
    ".tile", ".guide-card", ".safe-grid > li", ".safe-more",
    ".shop-list > li", ".get-card", ".plans > div", ".faq-list > details",
    ".gp-head > *", ".gp-list", ".gp-cta", ".doc-body > *"
  ];
  var elementos = [].slice.call(document.querySelectorAll(grupos.join(",")))
    .filter(function (el) { return !el.closest(".stage-hero"); });
  if (!elementos.length) return;

  raiz.classList.add("motion");

  // Cascada: el retraso depende de la posición entre hermanos del mismo tipo
  elementos.forEach(function (el) {
    var hermanos = el.parentElement ? [].slice.call(el.parentElement.children) : [el];
    var i = Math.max(0, hermanos.indexOf(el));
    el.style.setProperty("--d", Math.min(i, 5) * 60 + "ms");
    el.classList.add("reveal");
  });

  var visor = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        visor.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

  elementos.forEach(function (el) { visor.observe(el); });
})();
