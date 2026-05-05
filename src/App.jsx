import { useState, useEffect } from 'react'

import { BrowserRouter, Routes } from 'react-router-dom';
import { RenderRoutes } from './routes/routes.jsx';

console.log(['import.meta.env', import.meta.env]);
const base = import.meta.env.VITE_ENVIRONMENT == 'local' ? '/' : import.meta.env.VITE_ENVIRONMENT == 'development' ? '/sigcon/dev/' : '/sigcon/'

// Bloque AM (2026-05-03): este IIFE quedo duplicado tras mover la
// hidratacion del theme a main.jsx (entry point). Vite tree-shake-aba el
// codigo aqui en build de produccion porque App.jsx no exporta side-effects.
// Se mantiene como fallback defensivo por si main.jsx no corre primero.
(function hydrateBrandTheme() {
    try {
        // QA 2026-05-05: scope por companyId (ver main.jsx). Lee la clave
        // tenant-specific si hay user persistido; sino fallback al global.
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
        root.style.setProperty('--brand-primary', primary);
        root.style.setProperty('--brand-secondary', secondary);
        root.style.setProperty('--bs-primary', primary);
        root.style.setProperty('--bs-secondary', secondary);
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
            if (factor >= 0) {
                r = Math.round(r + (255-r)*factor); g = Math.round(g + (255-g)*factor); b = Math.round(b + (255-b)*factor);
            } else {
                r = Math.round(r*(1+factor)); g = Math.round(g*(1+factor)); b = Math.round(b*(1+factor));
            }
            const hx = n => Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0');
            return `#${hx(r)}${hx(g)}${hx(b)}`;
        };
        root.style.setProperty('--bs-primary-rgb', toRgb(primary));
        root.style.setProperty('--bs-secondary-rgb', toRgb(secondary));
        // Sneat template usa --config-* (el sidebar/avatar/botones reales)
        root.style.setProperty('--config-primary', primary);
        root.style.setProperty('--config-primary-rgb', toRgb(primary));
        root.style.setProperty('--config-primary-label', lighten(primary, 90));
        root.style.setProperty('--config-primary-hover', lighten(primary, -20));
        root.style.setProperty('--config-primary-focus', lighten(primary, 70));
        root.style.setProperty('--config-dark-primary', lighten(primary, -30));
    } catch (_) { /* ignore */ }
})();

function App() {

  return (
    <BrowserRouter basename={base}>
      <Routes>
        {RenderRoutes()}
      </Routes>
    </BrowserRouter>
  );
}

export default App