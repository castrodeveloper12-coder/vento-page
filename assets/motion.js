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

  if (!("IntersectionObserver" in window)) return;

  // Escena "Tu día en la tienda": el paso que cruza la mitad de la pantalla
  // es el activo, y el teléfono muestra su pantalla
  var pasos = [].slice.call(document.querySelectorAll(".story-step"));
  var pantallas = [].slice.call(document.querySelectorAll(".story-device img"));
  if (pasos.length && pantallas.length) {
    document.querySelector(".story").classList.add("story-js");
    var activar = function (i) {
      pasos.forEach(function (p) { p.classList.toggle("is-on", p.dataset.i === i); });
      pantallas.forEach(function (img) { img.classList.toggle("is-on", img.dataset.i === i); });
    };
    var actual = null;
    var pendiente = false;
    var revisar = function () {
      pendiente = false;
      var mitad = window.innerHeight / 2;
      var elegido = pasos[0];
      pasos.forEach(function (p) {
        if (p.getBoundingClientRect().top <= mitad) elegido = p;
      });
      if (elegido.dataset.i !== actual) {
        actual = elegido.dataset.i;
        activar(actual);
      }
    };
    revisar();
    window.addEventListener("scroll", function () {
      if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); }
    }, { passive: true });
    window.addEventListener("resize", revisar);
  }

  // Donde el navegador anima con el scroll (CSS animation-timeline), lo hace el CSS
  var porScroll = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");

  // Secciones apiladas (portada): cada sección se queda quieta cuando su final
  // llega al borde de abajo de la pantalla, y la siguiente sube por encima
  // mientras ella se desvanece. Así se lee completa antes de irse.
  var secciones = [].slice.call(document.querySelectorAll(".home main > section"));
  if (porScroll && !reducir && secciones.length > 1) {
    var capas = secciones.concat([document.querySelector(".footer")]).filter(Boolean);
    var nombres = capas.map(function (c, i) { return "--capa" + i; });
    document.body.style.setProperty("timeline-scope", nombres.join(", "));
    capas.forEach(function (c, i) {
      c.style.setProperty("view-timeline-name", nombres[i]);
      // Solo se va la sección que tiene otra sección detrás; la última no,
      // porque el pie es corto y la dejaría desaparecer del todo
      if (i < secciones.length - 1) {
        c.style.setProperty("animation", "se-va linear both");
        c.style.setProperty("animation-timeline", nombres[i + 1]);
        c.style.setProperty("animation-range", "entry 0% entry 100%");
      }
    });
    var alto = barra ? barra.offsetHeight : 64;
    var fijar = function () {
      alto = barra ? barra.offsetHeight : 64;
      secciones.forEach(function (sec) {
        sec.style.top = Math.min(alto, window.innerHeight - sec.offsetHeight) + "px";
      });
    };
    raiz.classList.add("stack");
    fijar();
    window.addEventListener("resize", fijar);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { fijar(); });
      secciones.forEach(function (sec) { ro.observe(sec); });
    }
  }

  if (reducir || porScroll) return;

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
