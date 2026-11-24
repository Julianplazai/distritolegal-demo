// Desplazamiento a una sección: con Lenis activo (scroll suave en animaciones.js) se usa el suyo,
// para que no se peleen los dos; si no, el del navegador
const irA = (el) => {
  if (!el) return;
  if (window.lenis) { window.lenis.scrollTo(el, { offset: -84 }); return; }
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
};

// Menú móvil: se abre con el botón y se cierra con Escape.
const botonMenu = document.querySelector(".boton-menu");
const nav = document.getElementById("nav");
if (botonMenu && nav) {
  botonMenu.addEventListener("click", () => {
    const abierto = botonMenu.getAttribute("aria-expanded") === "true";
    botonMenu.setAttribute("aria-expanded", String(!abierto));
    botonMenu.textContent = abierto ? "Menú" : "Cerrar";
    nav.classList.toggle("abierto", !abierto);
  });
}

// Desplegable de «Áreas»: clic o teclado; se cierra al salir, al pulsar fuera o con Escape.
document.querySelectorAll("[data-desplegable]").forEach((boton) => {
  const lista = document.getElementById(boton.getAttribute("aria-controls"));
  const cerrar = () => { boton.setAttribute("aria-expanded", "false"); lista.hidden = true; };
  boton.addEventListener("click", () => {
    const abierto = boton.getAttribute("aria-expanded") === "true";
    boton.setAttribute("aria-expanded", String(!abierto));
    lista.hidden = abierto;
  });
  document.addEventListener("click", (e) => {
    if (!boton.parentElement.contains(e.target)) cerrar();
  });
  boton.parentElement.addEventListener("focusout", (e) => {
    if (!boton.parentElement.contains(e.relatedTarget)) cerrar();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll("[data-desplegable][aria-expanded='true']").forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    document.getElementById(b.getAttribute("aria-controls")).hidden = true;
    b.focus();
  });
  if (botonMenu && botonMenu.getAttribute("aria-expanded") === "true") {
    botonMenu.setAttribute("aria-expanded", "false");
    botonMenu.textContent = "Menú";
    nav.classList.remove("abierto");
    botonMenu.focus();
  }
});

// Pestañas de áreas (patrón ARIA tabs: flechas, Inicio y Fin).
document.querySelectorAll("[role='tablist']").forEach((lista) => {
  const pestanas = [...lista.querySelectorAll("[role='tab']")];
  const activar = (p, enfocar) => {
    pestanas.forEach((otra) => {
      const activa = otra === p;
      otra.setAttribute("aria-selected", String(activa));
      otra.tabIndex = activa ? 0 : -1;
      document.getElementById(otra.getAttribute("aria-controls")).hidden = !activa;
    });
    if (enfocar) p.focus();
    document.dispatchEvent(new CustomEvent("pestana-cambiada", { detail: document.getElementById(p.getAttribute("aria-controls")) }));
  };
  pestanas.forEach((p, i) => {
    p.addEventListener("click", () => activar(p, false));
    p.addEventListener("keydown", (e) => {
      const mapa = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: pestanas.length - 1 };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      activar(pestanas[(mapa[e.key] + pestanas.length) % pestanas.length], true);
    });
  });
});

// Buscador de casos de la entrada. Indexa los enlaces de «Busca tu caso» (una sola fuente de datos)
// y les añade las palabras con las que la gente describe su problema.
const buscador = document.querySelector("[data-buscador]");
if (buscador) {
  const campo = buscador.querySelector("input");
  const lista = buscador.querySelector(".buscador-resultados");
  const estado = buscador.querySelector(".buscador-estado");
  const estadoInicial = estado.innerHTML;
  const normal = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const CLAVES = {
    "tarjetas-revolving": "tarjeta credito intereses usura usurarios deuda banco wizink cetelem",
    "segundaoportunidad": "deudas no puedo pagar embargo ruina cancelar deudas autonomo concurso",
    "clausulas-abusivas-en-hipoteca": "irph hipoteca abusiva banco",
    "clausula-suelo": "clausula suelo hipoteca interes minimo banco devolucion",
    "gastos-hipotecarios": "gastos hipoteca notaria registro gestoria tasacion comisiones banco devolucion",
    "seguros-de-vida-vinculados-a-hipotecas": "hipoteca seguro vida prestamo banco casa",
    "ficheros-morosidad": "asnef moroso morosos fichero lista deuda badexcug experian salir",
    "codigo-de-buenas-practicas": "hipoteca no puedo pagar reestructuracion dacion pago desahucio vulnerable",
    "reclamacion-financiacion-coches": "coche financiacion prestamo concesionario intereses",
    "accidentes-trafico": "accidente coche moto atropello choque trafico indemnizacion seguro",
    "reclamacion-vuelos": "vuelo avion retraso cancelado overbooking equipaje aerolinea",
    "cancelacion-eventos": "concierto festival entradas evento cancelado devolucion",
    "negligencia-cirugia-estetica": "negligencia medico operacion hospital error cirugia estetica",
    "reclamacion-clinicas-medico-esteticas": "clinica estetica dentista tratamiento cerrada financiacion",
    "ciberestafas": "estafa internet phishing bizum fraude tarjeta robo online sms",
    "despidos": "despido me han echado trabajo empresa indemnizacion improcedente",
    "accidentes-laborales": "accidente trabajo laboral empresa lesion",
    "bajas-laborales": "baja medica enfermedad mutua alta",
    "nominas-contratos-laborales": "nomina salario sueldo contrato horas extra impago",
    "liquidaciones-finiquitos": "finiquito liquidacion vacaciones fin contrato",
    "incapacidad-permanente": "incapacidad permanente pension invalidez enfermedad total absoluta",
    "pensiones-jubilaciones": "pension jubilacion jubilado seguridad social",
    "complemento-brecha-genero": "pension jubilacion complemento brecha genero madre hijos maternidad",
    "interinos": "interino interina funcionario temporal publica abuso",
    "divorcios-separaciones-matrimoniales": "divorcio separacion matrimonio pareja pension",
    "custodia-hijos": "custodia hijos compartida visitas pension alimentos",
    "herencias": "herencia testamento heredero fallecido reparto",
    "vicios-ocultos": "vicios ocultos vivienda casa piso compra defecto humedad coche",
    "extranjeria": "extranjeria papeles residencia nie arraigo visado nacionalidad",
    "derecho-al-honor": "honor difamacion injurias calumnias redes",
    "derechos-de-imagen": "imagen foto video publicada sin permiso redes",
    "delito-lesiones": "lesiones agresion golpe pelea denuncia",
    "robos": "robo hurto denuncia",
    "amenazas": "amenazas acoso denuncia",
    "condenas": "condena antecedentes penales juicio sentencia carcel",
    "tramites-administrativos": "tramite administracion recurso ayuntamiento",
    "multas-trafico": "multa trafico dgt sancion puntos radar",
    "plusvalia": "plusvalia impuesto venta casa ayuntamiento devolucion",
    "subvenciones-y-ayudas": "subvencion ayuda solicitud",
    "fiscalidad": "hacienda impuestos renta irpf declaracion",
  };
  const vistos = new Set();
  const casos = [...document.querySelectorAll(".explorador-panel")].flatMap((area) => {
    const nombreArea = area.dataset.area;
    return [...area.querySelectorAll("[data-caso]")].map((a) => {
      const clave = Object.keys(CLAVES).find((k) => a.href.includes(`/${k}/`)) || "";
      return { texto: a.querySelector(".caso-titulo").textContent.trim(), area: nombreArea, href: a.getAttribute("href"), indice: normal(`${a.textContent} ${nombreArea} ${CLAVES[clave] || ""}`).split(/\s+/) };
    });
  }).filter((c) => !vistos.has(c.href) && vistos.add(c.href));
  const POPULARES = ["Tarjetas revolving", "Despidos", "Accidentes de tráfico", "Ley de la Segunda Oportunidad", "Vuelos retrasados o cancelados"];

  const pintar = (resultados, mensaje) => {
    lista.innerHTML = resultados.map((c) => `<li><a href="${c.href}"><span>${c.texto}</span><small>${c.area}</small></a></li>`).join("");
    lista.hidden = resultados.length === 0;
    estado.innerHTML = mensaje;
  };
  const buscar = () => {
    const q = normal(campo.value.trim());
    if (!q) { pintar([], estadoInicial); return; }
    const palabras = q.split(/\s+/).filter((p) => p.length > 1 || q.length === 1);
    const res = casos
      .map((c) => ({ c, ok: palabras.every((p) => c.indice.some((w) => w.startsWith(p))), titulo: palabras.some((p) => normal(c.texto).includes(p)) }))
      .filter((r) => r.ok)
      .sort((a, b) => Number(b.titulo) - Number(a.titulo))
      .slice(0, 6)
      .map((r) => r.c);
    if (res.length) pintar(res, `${res.length === 1 ? "1 caso coincide" : `${res.length} casos coinciden`}. Pulsa el tuyo.`);
    else pintar([], `No lo encontramos con esas palabras. <a href="contacto.html">Cuéntanos tu caso</a> y te decimos si podemos ayudarte.`);
  };
  campo.addEventListener("input", buscar);
  // Al entrar en el campo vacío se sugieren los casos más habituales
  campo.addEventListener("focus", () => {
    if (!campo.value.trim()) pintar(casos.filter((c) => POPULARES.includes(c.texto)), "Los casos más habituales. Escribe para buscar el tuyo.");
  });
  // Flechas: del campo a los resultados y entre ellos; Escape vuelve al campo y cierra
  buscador.addEventListener("keydown", (e) => {
    const enlaces = [...lista.querySelectorAll("a")];
    const i = enlaces.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && enlaces.length) { e.preventDefault(); enlaces[Math.min(i + 1, enlaces.length - 1)].focus(); }
    if (e.key === "ArrowUp" && enlaces.length) { e.preventDefault(); if (i <= 0) campo.focus(); else enlaces[i - 1].focus(); }
    if (e.key === "Escape") { campo.focus(); pintar([], estadoInicial); }
  });
  // Intro: abre el primer resultado; sin resultados, lleva a todas las áreas
  buscador.addEventListener("submit", (e) => {
    e.preventDefault();
    const primero = lista.querySelector("a");
    if (primero) location.href = primero.href;
    else irA(document.getElementById("busca-tu-caso"));
  });
  // Al salir del buscador con el ratón o el teclado se cierran las sugerencias
  document.addEventListener("click", (e) => { if (!buscador.contains(e.target)) { lista.hidden = true; } });
  buscador.addEventListener("focusout", (e) => { if (!buscador.contains(e.relatedTarget)) setTimeout(() => { if (!buscador.contains(document.activeElement)) lista.hidden = true; }, 100); });
}

// Explorador de casos: pestañas de área (patrón WAI-ARIA con activación automática).
// Sin JS todas las áreas se ven seguidas; aquí se enseña una cada vez.
const explorador = document.querySelector("[data-explorador]");
if (explorador) {
  const pestanas = [...explorador.querySelectorAll('[role="tab"]')];
  const paneles = pestanas.map((p) => document.getElementById(p.getAttribute("aria-controls")));
  const elegir = (i, enfocar) => {
    pestanas.forEach((p, k) => {
      const si = k === i;
      p.setAttribute("aria-selected", String(si));
      p.tabIndex = si ? 0 : -1;
      paneles[k].hidden = !si;
    });
    if (enfocar) pestanas[i].focus();
  };
  explorador.classList.add("activo");
  paneles.forEach((p) => p.setAttribute("tabindex", "-1"));
  elegir(0, false);
  pestanas.forEach((p, i) => {
    p.addEventListener("click", () => {
      elegir(i, false);
      // En móvil el panel queda debajo de los botones: se baja hasta él
      if (!matchMedia("(min-width: 1000px)").matches) irA(paneles[i]);
    });
    p.addEventListener("keydown", (e) => {
      const n = pestanas.length;
      const destino = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      elegir((destino + n) % n, true);
    });
  });
}

// Formulario de contacto de la demo: valida y simula el envío, sin mandar datos a ningún sitio.
const form = document.getElementById("form-contacto");
if (form) {
  const estado = document.getElementById("estado-envio");
  const boton = form.querySelector("button[type='submit']");
  const reglas = {
    nombre: (v) => v.trim() ? "" : "Escribe tu nombre para saber cómo dirigirnos a ti.",
    telefono: (v) => /^[+\d][\d\s]{8,}$/.test(v.trim()) ? "" : "Escribe un teléfono de al menos 9 cifras para poder llamarte.",
    email: (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Este correo no parece completo. Revisa que tenga @ y dominio.",
    area: (v) => v ? "" : "Elige el área que más se parece a tu caso.",
    caso: (v) => v.trim().length >= 20 ? "" : "Cuéntanos tu caso en al menos 20 caracteres para poder valorarlo.",
    privacidad: (_, el) => el.checked ? "" : "Necesitamos tu permiso para tratar tus datos y responderte.",
  };

  const validar = (campo) => {
    const el = form.elements[campo];
    const mensaje = reglas[campo](el.value, el);
    el.setAttribute("aria-invalid", mensaje ? "true" : "false");
    document.getElementById(`error-${campo}`).textContent = mensaje;
    return !mensaje;
  };

  Object.keys(reglas).forEach((campo) => {
    const el = form.elements[campo];
    el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "blur", () => validar(campo));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    estado.className = "estado";
    estado.textContent = "";
    const fallos = Object.keys(reglas).filter((c) => !validar(c));
    if (fallos.length) {
      form.elements[fallos[0]].focus();
      estado.classList.add("estado-error");
      estado.innerHTML = `<strong>Faltan datos</strong>Revisa ${fallos.length === 1 ? "el campo marcado" : `los ${fallos.length} campos marcados`} en rojo.`;
      return;
    }
    boton.disabled = true;
    boton.textContent = "Enviando…";
    setTimeout(() => {
      boton.disabled = false;
      boton.textContent = "Enviar mi caso";
      estado.classList.add("estado-ok");
      estado.innerHTML = "<strong>Caso recibido (simulación de la demo)</strong>En la web real, aquí te confirmaríamos que un abogado te llamará en menos de 48 h.";
      form.reset();
      estado.focus();
    }, 900);
  });
}
