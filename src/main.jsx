import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './utils/reducers/store.jsx'

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

import App from './App.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
