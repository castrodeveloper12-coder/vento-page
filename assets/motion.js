// Movimiento de Vueltito, con criterios de Apple:
// - Las cosas aparecen al bajar, subiendo un poco y con una curva tipo resorte sin rebote.
// - Dentro de un grupo (tarjetas, preguntas) aparecen en cascada, con poco retraso.
// - La barra de arriba muestra su borde solo cuando hay contenido pasando por debajo.
// - Si el teléfono pide menos movimiento, no se mueve nada: solo aparece.
// - Sin JavaScript todo se ve igual, sin esconder nada.
// - Al cargar no se mide nada a la fuerza: los observadores avisan cuando ya hay diseño.
(function () {
  var raiz = document.documentElement;
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var soporta = function (condicion) { return !!(window.CSS && CSS.supports && CSS.supports(condicion)); };

  if (!("IntersectionObserver" in window)) return;

  // Barra de arriba: el borde lo pone el CSS con la consulta scroll-state.
  // Donde no existe, una marca invisible de 8 px arriba de la página: cuando
  // deja de verse, ya bajaste y aparece el borde.
  var barra = document.querySelector(".topbar");
  if (barra && !soporta("container-type: scroll-state")) {
    var marca = document.createElement("div");
    marca.className = "marca-scroll";
    marca.setAttribute("aria-hidden", "true");
    document.body.prepend(marca);
    new IntersectionObserver(function (entradas) {
      barra.classList.toggle("is-scrolled", !entradas[0].isIntersecting);
    }).observe(marca);
  }

  // Escena "Tu día en la tienda": el paso que cruza la mitad de la pantalla
  // es el activo, y el teléfono muestra su pantalla. La "línea" del medio es
  // un observador con margen de -50 % arriba y abajo.
  var pasos = [].slice.call(document.querySelectorAll(".story-step"));
  var pantallas = [].slice.call(document.querySelectorAll(".story-device img"));
  if (pasos.length && pantallas.length) {
    document.querySelector(".story").classList.add("story-js");
    var activar = function (i) {
      pasos.forEach(function (p) { p.classList.toggle("is-on", p.dataset.i === i); });
      pantallas.forEach(function (img) { img.classList.toggle("is-on", img.dataset.i === i); });
    };
    activar(pasos[0].dataset.i);
    var linea = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) activar(e.target.dataset.i); });
    }, { rootMargin: "-50% 0px -50% 0px" });
    pasos.forEach(function (p) { linea.observe(p); });
  }

  // Donde el navegador anima con el scroll (CSS animation-timeline con rangos), lo hace el CSS
  var porScroll = soporta("(animation-timeline: view()) and (animation-range: entry)");

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
    raiz.classList.add("stack");
    // Primero se mide todo y después se escribe: una sola pasada de diseño
    var fijar = function () {
      var alto = barra ? barra.offsetHeight : 64;
      var pantalla = window.innerHeight;
      var altos = secciones.map(function (sec) { return sec.offsetHeight; });
      secciones.forEach(function (sec, i) {
        sec.classList.toggle("no-stack", i === 0 && altos[i] > pantalla - alto);
        sec.style.top = Math.min(alto, pantalla - altos[i]) + "px";
      });
    };
    var pendiente = false;
    var pedirFijar = function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { pendiente = false; fijar(); });
    };
    window.addEventListener("resize", pedirFijar);
    if ("ResizeObserver" in window) {
      // Su primer aviso llega con el diseño ya hecho (también al cargar)
      var ro = new ResizeObserver(fijar);
      secciones.forEach(function (sec) { ro.observe(sec); });
    } else {
      pedirFijar();
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
