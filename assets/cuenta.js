// Página de la cuenta: recibe los enlaces de los correos de Firebase Authentication
// (crear contraseña nueva, confirmar correo, recuperar correo) y habla directo con la
// API de Firebase, sin cargar código de terceros.
// https://firebase.google.com/docs/auth/custom-email-handler
'use strict';

(() => {
  // Clave pública del proyecto de Vueltito: viene en cada enlace de los correos.
  // Solo se aceptan enlaces de este proyecto.
  const CLAVE = 'AIzaSyBxxF8i1cD06Kcjmtfz86tZhaOY2iZynWA';
  const API = 'https://identitytoolkit.googleapis.com/v1/accounts:';

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const modo = params.get('mode');
  const codigo = params.get('oobCode');
  const clave = params.get('apiKey');

  // El código del enlace es de un solo uso y da acceso a la cuenta: se saca de la barra
  // de direcciones y del historial apenas se lee.
  if (location.search) history.replaceState(null, '', location.pathname);

  const mostrar = (id) => {
    document.querySelectorAll('.estado').forEach((el) => { el.hidden = el.id !== id; });
    const titulo = $(id)?.querySelector('h1');
    if (titulo) {
      titulo.tabIndex = -1;
      titulo.focus();
    }
  };

  const errorEnlace = (titulo, texto) => {
    $('error-titulo').textContent = titulo;
    $('error-texto').textContent = texto;
    mostrar('error-enlace');
  };

  const PEDIR_OTRO = 'Pide uno nuevo desde la app: en la pantalla para entrar, toca «¿Olvidaste tu contraseña?».';

  // Mensajes para los errores de Firebase. Los de enlace muestran la pantalla de error;
  // los demás se avisan sin salir del formulario.
  const explicar = (codigoError) => {
    const c = String(codigoError || '');
    if (c.startsWith('EXPIRED_OOB_CODE')) return { enlace: true, titulo: 'Este enlace venció', texto: `Los enlaces sirven por poco tiempo. ${PEDIR_OTRO}` };
    if (c.startsWith('INVALID_OOB_CODE')) return { enlace: true, titulo: 'Este enlace ya no sirve', texto: `Ya se usó o no está completo. ${PEDIR_OTRO}` };
    if (c.startsWith('USER_DISABLED')) return { enlace: true, titulo: 'Esta cuenta está desactivada', texto: 'Escríbenos a soporte@vueltito.app y lo revisamos.' };
    if (c.startsWith('USER_NOT_FOUND') || c.startsWith('EMAIL_NOT_FOUND')) return { enlace: true, titulo: 'No encontramos la cuenta', texto: 'Puede que se haya eliminado. Escríbenos a soporte@vueltito.app si necesitas ayuda.' };
    if (c.startsWith('WEAK_PASSWORD')) return { texto: 'Elige una contraseña más larga: al menos 6 caracteres.' };
    if (c.startsWith('TOO_MANY_ATTEMPTS_TRY_LATER')) return { texto: 'Hubo muchos intentos seguidos. Espera unos minutos y vuelve a intentar.' };
    return { texto: 'No se pudo completar. Intenta de nuevo en un momento.' };
  };

  const llamar = async (metodo, cuerpo) => {
    let respuesta;
    try {
      respuesta = await fetch(`${API}${metodo}?key=${encodeURIComponent(CLAVE)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    } catch {
      const e = new Error('red');
      e.red = true;
      throw e;
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      const e = new Error('firebase');
      e.codigo = datos?.error?.message;
      throw e;
    }
    return datos;
  };

  const SIN_RED = 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';

  // ── Crear contraseña nueva ──────────────────────────────────────
  const prepararFormulario = (correo) => {
    const form = $('form-clave');
    const campo = $('new-password');
    const ver = $('ver-clave');
    const aviso = $('aviso-form');
    const boton = $('guardar');
    $('correo-cuenta').textContent = correo;
    $('usuario').value = correo;

    ver.addEventListener('click', () => {
      const visible = campo.type === 'text';
      campo.type = visible ? 'password' : 'text';
      ver.setAttribute('aria-pressed', String(!visible));
      ver.textContent = visible ? 'Mostrar' : 'Ocultar';
    });

    // El estado accesible (aria-invalid) sigue al visual (:user-invalid), y el mensaje
    // de error se enlaza al campo solo mientras se muestra.
    const errorId = campo.dataset.error;
    const sincronizar = () => {
      const invalido = campo.matches(':user-invalid');
      campo.setAttribute('aria-invalid', String(invalido));
      const ids = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== errorId);
      if (invalido) ids.push(errorId);
      campo.setAttribute('aria-describedby', ids.join(' '));
    };
    campo.setAttribute('aria-invalid', 'false');
    campo.addEventListener('blur', sincronizar);
    campo.addEventListener('invalid', () => {
      campo.setCustomValidity('Escribe una contraseña de al menos 6 caracteres.');
      sincronizar();
    });
    campo.addEventListener('input', () => {
      campo.setCustomValidity('');
      aviso.textContent = '';
      if (campo.getAttribute('aria-invalid') === 'true') sincronizar();
    });

    let enviando = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (enviando) return;
      enviando = true;
      boton.setAttribute('aria-disabled', 'true');
      boton.textContent = 'Guardando…';
      aviso.textContent = '';
      try {
        await llamar('resetPassword', { oobCode: codigo, newPassword: campo.value });
        mostrar('clave-lista');
      } catch (err) {
        const r = err.red ? { texto: SIN_RED } : explicar(err.codigo);
        if (r.enlace) {
          errorEnlace(r.titulo, r.texto);
        } else {
          aviso.textContent = r.texto;
          campo.focus();
        }
      } finally {
        enviando = false;
        boton.removeAttribute('aria-disabled');
        boton.textContent = 'Guardar contraseña nueva';
      }
    });

    mostrar('nueva-clave');
  };

  // ── Arranque ────────────────────────────────────────────────────
  const empezar = async () => {
    if (!modo || !codigo) {
      errorEnlace('Este enlace está incompleto', `Ábrelo directo desde el correo, sin copiar una parte. ${PEDIR_OTRO}`);
      return;
    }
    if (clave !== CLAVE) {
      errorEnlace('Este enlace no es de Vueltito', 'Si te llegó en un correo a tu nombre, escríbenos a soporte@vueltito.app.');
      return;
    }
    try {
      if (modo === 'resetPassword') {
        // Sin contraseña, Firebase solo revisa el código y devuelve el correo de la cuenta
        const datos = await llamar('resetPassword', { oobCode: codigo });
        prepararFormulario(datos.email || '');
      } else if (modo === 'verifyEmail' || modo === 'verifyAndChangeEmail') {
        await llamar('update', { oobCode: codigo });
        mostrar('correo-listo');
      } else if (modo === 'recoverEmail') {
        const datos = await llamar('resetPassword', { oobCode: codigo });
        await llamar('update', { oobCode: codigo });
        const correo = datos.email || '';
        $('correo-recuperado-dir').textContent = correo;
        mostrar('correo-recuperado');
        $('pedir-clave').addEventListener('click', async () => {
          const aviso = $('aviso-recuperado');
          try {
            await llamar('sendOobCode', { requestType: 'PASSWORD_RESET', email: correo });
            aviso.classList.add('ok');
            aviso.textContent = `Listo: te enviamos un enlace a ${correo}.`;
          } catch (err) {
            aviso.classList.remove('ok');
            aviso.textContent = err.red ? SIN_RED : explicar(err.codigo).texto;
          }
        });
      } else {
        errorEnlace('Este enlace no se usa aquí', 'Escríbenos a soporte@vueltito.app y te ayudamos.');
      }
    } catch (err) {
      if (err.red) {
        errorEnlace('No pudimos conectarnos', 'Revisa tu internet y vuelve a abrir el enlace del correo.');
        return;
      }
      const r = explicar(err.codigo);
      errorEnlace(r.titulo || 'Algo salió mal', r.texto);
    }
  };

  empezar();
})();
