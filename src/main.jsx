import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './utils/reducers/store.jsx'

// QA Bloque PA Bug 73 (HU-PA-PLAT-XX, 2026-05-10): aislamiento de sesion por
// pestaña. ANTES el token, user e isLoggedIn vivian en localStorage, que es
// COMPARTIDO entre TODAS las pestañas del mismo origen. Resultado: si en la
// pestaña A loguebas como ADMIN_EMPRESA y en la pestaña B como PLATFORM_ADMIN,
// la ultima escritura ganaba. Cualquier fetch o F5 en la pestaña A leia el
// token de B y mostraba datos cross-empresa.
//
// Fix: interceptar localStorage para las 3 keys de auth y redirigirlas a
// sessionStorage (que SI esta aislado por pestaña). Los ~26 archivos del
// proyecto que leen `localStorage.getItem('token')` no se tocan — el override
// les devuelve transparente lo de sessionStorage.
//
// Bridge unico: si la pestaña actual no tiene sesion en sessionStorage pero
// localStorage tiene un token "huerfano" de la version anterior pre-fix,
// heredarlo UNA SOLA VEZ y limpiar localStorage. Asi los usuarios que tenian
// sesion abierta antes del deploy del fix no quedan deslogueados de golpe.
//
// Este patron tiene una consecuencia UX intencional: abrir una NUEVA pestaña
// (Ctrl+T y pegar URL) requiere re-loguear, porque sessionStorage NO se
// comparte entre pestañas. Si en el futuro se quiere "mismo login en todas
// las pestañas mientras coincida el usuario", se puede agregar BroadcastChannel
// para sincronizar logins compatibles. Por ahora, una pestaña = una sesion.
(function isolateAuthPerTab() {
    const AUTH_KEYS = new Set(['token', 'user', 'isLoggedIn']);
    // Chrome NO permite Object.defineProperty directo sobre la instancia
    // localStorage (no es configurable a nivel instancia). La forma confiable
    // es modificar Storage.prototype y discriminar por `this === localStorage`
    // para no afectar sessionStorage normal.
    const proto = Storage.prototype;
    const origGetItem = proto.getItem;
    const origSetItem = proto.setItem;
    const origRemoveItem = proto.removeItem;

    // Bridge unico: heredar token huerfano de localStorage hacia sessionStorage
    // (solo la primera vez que esta pestaña se abre tras el deploy del fix).
    if (!origGetItem.call(sessionStorage, 'token')) {
        const legacyToken = origGetItem.call(localStorage, 'token');
        const legacyUser = origGetItem.call(localStorage, 'user');
        const legacyLogged = origGetItem.call(localStorage, 'isLoggedIn');
        if (legacyToken) {
            origSetItem.call(sessionStorage, 'token', legacyToken);
            if (legacyUser) origSetItem.call(sessionStorage, 'user', legacyUser);
            if (legacyLogged) origSetItem.call(sessionStorage, 'isLoggedIn', legacyLogged);
        }
    }
    // Limpiar localStorage de auth keys (tras el bridge ya no las necesitamos
    // ahi y dejarlas seria un riesgo: nuevas pestañas podrian heredar sesion
    // de un usuario que ya cerro la suya).
    origRemoveItem.call(localStorage, 'token');
    origRemoveItem.call(localStorage, 'user');
    origRemoveItem.call(localStorage, 'isLoggedIn');

    // Override Storage.prototype con discriminacion: si la operacion es sobre
    // localStorage Y la key es de auth, redirigir a sessionStorage. Cualquier
    // otra combinacion (sessionStorage normal, localStorage con keys distintas
    // como theme/prefs/cache) se comporta como siempre.
    proto.getItem = function(key) {
        if (this === localStorage && AUTH_KEYS.has(key)) {
            return origGetItem.call(sessionStorage, key);
        }
        return origGetItem.call(this, key);
    };
    proto.setItem = function(key, value) {
        if (this === localStorage && AUTH_KEYS.has(key)) {
            return origSetItem.call(sessionStorage, key, value);
        }
        return origSetItem.call(this, key, value);
    };
    proto.removeItem = function(key) {
        if (this === localStorage && AUTH_KEYS.has(key)) {
            return origRemoveItem.call(sessionStorage, key);
        }
        return origRemoveItem.call(this, key);
    };
})();

// import $ from 'jquery';

// window.$ = window.jQuery = $;

// // CSS
// import 'select2/dist/css/select2.min.css';

// // JS (FULL)
// import 'select2/dist/js/select2.full.min.js';

// Bloque AM (2026-05-03): hidratacion del theme al boot. Debe correr ANTES
// que React monte y DESPUES que config.js corra (config.js esta en <head>
// y main.jsx en el final del body, asi que orden garantizado).
// Lee `sigcon_brand_theme` del localStorage (persistido al Guardar en
// /parametrizacion/identidad-visual) y sobreescribe las CSS vars que el
// template Sneat usa (--config-primary y derivadas) + Bootstrap (--bs-primary).
(function hydrateBrandThemeAtBoot() {
    try {
        // QA 2026-05-05: scope por companyId para evitar bleed entre tenants.
        // Si hay un user persistido (post-login), buscar su clave especifica
        // primero. Fallback al global por compatibilidad legacy.
        let key = 'sigcon_brand_theme';
        try {
            const userRaw = localStorage.getItem('user');
            if (userRaw) {
                const u = JSON.parse(userRaw);
                if (u?.companyId) key = `sigcon_brand_theme_${u.companyId}`;
            }
        } catch (_) { /* ignore */ }
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const cfg = JSON.parse(raw);
        const root = document.documentElement;
        const primary = cfg.primaryColor || '#1E5DAB';
        const secondary = cfg.secondaryColor || '#F4A623';
        const toRgb = (h) => {
            const c = h?.startsWith('#') ? h.substring(1) : (h || '');
            const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
            if (f.length !== 6) return '30, 93, 171';
            return `${parseInt(f.substring(0,2),16)}, ${parseInt(f.substring(2,4),16)}, ${parseInt(f.substring(4,6),16)}`;
        };
        const lighten = (h, pct) => {
            const c = h?.startsWith('#') ? h.substring(1) : (h || '');
            const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
            if (f.length !== 6) return h;
            let r = parseInt(f.substring(0,2),16), g = parseInt(f.substring(2,4),16), b = parseInt(f.substring(4,6),16);
            const factor = pct / 100;
            if (factor >= 0) { r = Math.round(r + (255-r)*factor); g = Math.round(g + (255-g)*factor); b = Math.round(b + (255-b)*factor); }
            else { r = Math.round(r*(1+factor)); g = Math.round(g*(1+factor)); b = Math.round(b*(1+factor)); }
            const hx = n => Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0');
            return `#${hx(r)}${hx(g)}${hx(b)}`;
        };
        root.style.setProperty('--brand-primary', primary);
        root.style.setProperty('--brand-secondary', secondary);
        root.style.setProperty('--bs-primary', primary);
        root.style.setProperty('--bs-primary-rgb', toRgb(primary));
        root.style.setProperty('--bs-secondary', secondary);
        root.style.setProperty('--bs-secondary-rgb', toRgb(secondary));
        root.style.setProperty('--config-primary', primary);
        root.style.setProperty('--config-primary-rgb', toRgb(primary));
        root.style.setProperty('--config-primary-label', lighten(primary, 90));
        root.style.setProperty('--config-primary-hover', lighten(primary, -20));
        root.style.setProperty('--config-primary-focus', lighten(primary, 70));
        root.style.setProperty('--config-dark-primary', lighten(primary, -30));
    } catch (_) { /* ignore */ }
})();

// QA Bloque post-AAEF (2026-05-28): SweetAlert mostraba un boton "No" extra
// (.swal2-deny) en TODOS los modales del proyecto aunque cada uno tuviera
// `inline style="display: none"`. El computed final daba `display: flex` por
// alguna regla del bundle de Swat o de Bootstrap que sobreescribia el inline.
// Como workaround se habia parcheado a mano `showDenyButton: false` en ~10
// archivos, dejando el resto vulnerable. Esta IIFE inyecta una regla con
// !important que respeta el inline `display: none` del propio Swal, eliminando
// el "No" fantasma en TODOS los Swal sin tocar caller por caller. Los Swal que
// activan explicitamente `showDenyButton: true` (ej. reapertura con Aprobar /
// Rechazar) NO se ven afectados: su inline no es `display: none`.
(function fixSwalDenyButtonGhost() {
    try {
        const style = document.createElement('style');
        style.setAttribute('data-source', 'sigcon-swal-deny-fix');
        // QA Bloque BNK (2026-06-03) Bug 7: el MISMO fantasma afectaba a
        // `.swal2-cancel` (boton "Cancel" rojo). SweetAlert le pone inline
        // `display: none` cuando showCancelButton es false, pero una regla del
        // bundle lo sobreescribia a `display: flex`. Se extiende el fix a cancel
        // (y confirm por consistencia) para respetar el inline en TODOS los Swal.
        style.textContent =
            '.swal2-deny[style*="display: none"],' +
            '.swal2-cancel[style*="display: none"],' +
            '.swal2-confirm[style*="display: none"]{display:none !important;}';
        document.head.appendChild(style);
    } catch (_) { /* fail-safe */ }
})();

import App from './App.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
