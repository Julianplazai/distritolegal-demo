// Movimiento del rediseño (MOTION 3). Todo vive dentro de «sin preferencia de reducir movimiento»:
// con la preferencia activa, o si GSAP no carga, la página queda quieta y completa.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, window.SplitText);
  // El mismo archivo sirve a las tres páginas: lo que no existe en una página se omite sin avisos
  gsap.config({ nullTargetWarn: false });
  const hay = (sel) => document.querySelector(sel) !== null;
  // Formato español con punto de miles también en cifras de 4 dígitos (Intl no lo agrupa: «7000»)
  const formato = (valor, decimales) => {
    const [entero, fraccion] = valor.toFixed(decimales).split(".");
    return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (fraccion ? "," + fraccion : "");
  };

  // Barra de progreso de lectura bajo la cabecera: informa de dónde estás, también sin animaciones
  gsap.to(".progreso", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  // Palabra que rota en la entrada: enseña los casos más comunes
  const casos = ["tu tarjeta revolving", "tu hipoteca", "tu despido", "tu vuelo cancelado", "tu accidente", "tus deudas"];
  const rotador = document.querySelector(".rotador .palabra");
  let rotar = null;
  let indice = 0;

  const mm = gsap.matchMedia();
  const listo = document.fonts ? document.fonts.ready : Promise.resolve();

  // Scroll suave (Lenis) sincronizado con ScrollTrigger: el desplazamiento y las animaciones van al mismo reloj.
  // En pantallas táctiles Lenis deja el scroll nativo; con movimiento reducido no se activa
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    if (!window.Lenis) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    window.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tic = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tic);
    gsap.ticker.lagSmoothing(0);
    // Enlaces internos (#…) con el mismo scroll suave, sin quedar bajo la cabecera
    const anclas = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      const destino = document.querySelector(a.getAttribute("href"));
      if (!destino) return;
      e.preventDefault();
      lenis.scrollTo(destino, { offset: -84 });
    };
    document.addEventListener("click", anclas);
    return () => { document.removeEventListener("click", anclas); gsap.ticker.remove(tic); lenis.destroy(); window.lenis = null; };
  });

  // Entrada común: las piezas aparecen subiendo y pasando de desenfocadas a nítidas, escalonadas por grupo
  const revelar = (sel, extra = {}) => {
    const els = gsap.utils.toArray(sel);
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 40, filter: "blur(10px)" });
    ScrollTrigger.batch(els, {
      start: "top 88%", once: true,
      onEnter: (lote) => gsap.to(lote, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power3.out", stagger: 0.09, clearProps: "filter,transform", ...extra }),
    });
  };
  mm.add("(prefers-reduced-motion: no-preference)", () => {

    listo.then(() => {
      // Titulares que entran letra a letra (SplitText): solo frases cortas
      const titulares = [...document.querySelectorAll("[data-dividir]")];
      titulares.forEach((el) => {
        const partes = new SplitText(el, { type: "words,chars", wordsClass: "sp-palabra" });
        gsap.set(partes.words, { display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" });
        const enHero = el.closest(".hero");
        gsap.from(partes.chars, {
          yPercent: 110,
          rotate: 6,
          duration: enHero ? 0.9 : 0.7,
          ease: "expo.out",
          stagger: enHero ? 0.035 : 0.018,
          delay: enHero ? 0.15 : 0,
          scrollTrigger: enHero ? undefined : { trigger: el, start: "top 85%", once: true },
        });
      });

      // Entrada: texto, botón y foto en secuencia
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero .para", { y: 30, opacity: 0, duration: 0.8 }, 0.55)
        .from(".hero .entrada", { y: 24, opacity: 0, duration: 0.8 }, 0.7)
        .from(".hero-acciones > *, .hero-pie > *", { yPercent: 40, opacity: 0, duration: 0.7, stagger: 0.08, clearProps: "transform" }, 0.8)
        // La foto se abre desde abajo dentro de su marco (sin moverse de sitio: las caras no saltan)
        .from(".hero-foto img", { clipPath: "inset(100% 0% 0% 0% round 32px 0px 0px 32px)", duration: 1.3, ease: "expo.inOut", clearProps: "clipPath" }, 0.2);
    });

    // Palabra rotatoria
    if (rotador) {
      const cambiar = () => {
        indice = (indice + 1) % casos.length;
        const salida = gsap.timeline();
        salida.to(rotador, { yPercent: -100, opacity: 0, duration: 0.45, ease: "power3.in" })
          .add(() => { rotador.textContent = casos[indice]; })
          .fromTo(rotador, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
      };
      rotar = gsap.delayedCall(2.4, function repetir() { cambiar(); rotar = gsap.delayedCall(2.6, repetir); });
    }

    // Misión: las palabras se encienden al leer (de #6F878C, 3,5:1 en texto grande, a azul)
    const frase = document.querySelector("[data-leer]");
    if (frase) {
      listo.then(() => {
        const palabras = new SplitText(frase, { type: "words" }).words;
        gsap.fromTo(palabras, { color: "#6F878C" }, {
          color: "#031731", stagger: 0.12, ease: "none",
          scrollTrigger: { trigger: frase, start: "top 80%", end: "bottom 45%", scrub: true },
        });
      });
    }

    // Cifras de cristal
    revelar(".pildora");

    // Contadores: suben hasta su cifra real al aparecer
    document.querySelectorAll("[data-contar]").forEach((el) => {
      const meta = parseFloat(el.dataset.contar);
      const decimales = Number(el.dataset.decimales || 0);
      const prefijo = el.dataset.prefijo || "";
      const sufijo = el.dataset.sufijo || "";
      const estado = { v: 0 };
      gsap.to(estado, {
        v: meta, duration: 2, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => { el.textContent = prefijo + formato(estado.v, decimales) + sufijo; },
      });
    });

    // Áreas: las cuatro tarjetas entran escalonadas
    // Explorador de casos: las áreas y las tarjetas del área abierta entran escalonadas al llegar
    if (hay(".explorador")) gsap.from(".explorador .area-boton, .explorador-panel:not([hidden]) .casos-rejilla li", { y: 30, opacity: 0, duration: 0.7, ease: "expo.out", stagger: 0.04, clearProps: "transform,opacity", scrollTrigger: { trigger: ".explorador", start: "top 85%", once: true } });

    // Hojas: cada panel claro sube y se asienta al entrar, como una hoja que se posa sobre la mesa
    gsap.utils.toArray(".hoja").forEach((hoja) => {
      gsap.from(hoja, { y: 80, scale: 0.97, ease: "none", scrollTrigger: { trigger: hoja, start: "top bottom", end: "top 55%", scrub: 0.8 } });
    });


    // Abogados: el recorte sube y baja con el scroll sobre su arco
    document.querySelectorAll("[data-paralaje]").forEach((img) => {
      gsap.fromTo(img, { yPercent: 8 }, { yPercent: -6, ease: "none", scrollTrigger: { trigger: img.closest(".abogado"), start: "top bottom", end: "bottom top", scrub: true } });
    });
    if (hay(".abogados-lista")) gsap.from(".abogado-foto", { clipPath: "inset(100% 0 0 0)", duration: 1.2, ease: "expo.inOut", stagger: 0.2, scrollTrigger: { trigger: ".abogados-lista", start: "top 80%", once: true } });

    // Opiniones, prensa, calculadoras y textos de los abogados
    revelar(".rejilla-opiniones li");
    revelar(".movil");
    revelar(".calculadoras-lista li");
    revelar(".abogado > div:last-child");
    // Página de opiniones: reseñas, oficinas, abogados, áreas, fotos y enlaces para opinar
    revelar(".resena, .oficina-google, .abogado-tarjeta, .area-resuelta, .galeria li, .opinar");
    // Las piezas de cristal entran sin desenfoque: un filtro en el padre anula su backdrop-filter mientras dura
    gsap.utils.toArray(".fiable-lista li").forEach((el, i) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", delay: (i % 3) * 0.08, clearProps: "transform,opacity", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });

    // Cabecera de las páginas interiores: título, texto y garantías en secuencia
    if (document.querySelector(".cabeza-pagina")) {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".cabeza-pagina h1", { y: 50, opacity: 0, duration: 1 }, 0.1)
        .from(".cabeza-pagina .entrada, .cabeza-pagina .hero-acciones", { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.3)
        .from(".garantias li", { x: 30, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.4);
    }
    gsap.utils.toArray(".servicios-lista li, .lista-casos li, .pasos li, .experto, .campos > *").forEach((el) => {
      gsap.from(el, { y: 20, opacity: 0, duration: 0.6, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });

    // Subtítulos y textos de apoyo: aparecen suaves
    revelar(".subtitulo, .intro, .apoyo, .prensa-cabeza p, .opiniones .texto > p, .trustpilot-mini, .preguntas details, .contacto-banda .contenedor, .aviso, .formulario");
  });

  // Proceso: las tarjetas entran juntas y después la línea avanza con el scroll, tramo a tramo,
  // encendiendo cada paso al llegar a su nodo (horizontal en escritorio, vertical en móvil)
  const marcoPasos = document.querySelector(".pasos-marco");
  if (marcoPasos) {
    const pasos = [...marcoPasos.querySelectorAll(".paso")];
    const tramos = [...marcoPasos.querySelectorAll(".paso-tramo i")];
    const montar = (eje, inicio, fin) => {
      marcoPasos.classList.add("en-espera");
      gsap.set(tramos, { [eje]: 0 });
      const entrada = gsap.from(marcoPasos.querySelectorAll(".paso-tarjeta"), {
        y: 28, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, clearProps: "transform,opacity",
        scrollTrigger: { trigger: marcoPasos, start: "top 88%", once: true },
      });
      // Un respiro de 0,15 al principio enciende el primer paso antes de que salga su tramo
      const linea = gsap.timeline({
        scrollTrigger: { trigger: marcoPasos, start: inicio, end: fin, scrub: 0.6 },
        onUpdate() {
          const t = this.time() - 0.15;
          pasos.forEach((p, i) => p.classList.toggle("activo", i === 0 ? this.time() > 0.05 : t >= i - 0.03));
        },
      });
      linea.to({}, { duration: 0.15 });
      tramos.forEach((tramo) => linea.to(tramo, { [eje]: 1, duration: 1, ease: "none" }));
      return () => {
        entrada.scrollTrigger?.kill(); entrada.kill(); linea.scrollTrigger?.kill(); linea.kill();
        gsap.set(tramos, { clearProps: "transform" });
        marcoPasos.classList.remove("en-espera"); pasos.forEach((p) => p.classList.remove("activo"));
      };
    };
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1000px)", () => montar("scaleX", "top 72%", "top 32%"));
    mm.add("(prefers-reduced-motion: no-preference) and (max-width: 999px)", () => montar("scaleY", "top 70%", "bottom 65%"));
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
