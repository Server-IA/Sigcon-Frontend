import { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

/**
 * HU-PA-BRAND-01: Identidad visual por empresa.
 *
 * <p>Pantalla de configuración con preview en tiempo real (E4):
 * <ul>
 *   <li>Color picker primario y secundario.</li>
 *   <li>Upload de logo (PNG/JPG/SVG, max 500KB) — preview se actualiza al instante.</li>
 *   <li>Nombre comercial editable.</li>
 *   <li>Panel preview con sidebar simulada, header, botón primario y card.</li>
 *   <li>Cálculo de contraste WCAG AA en vivo (texto blanco vs primario).</li>
 *   <li>Reset al theme default (E5).</li>
 * </ul>
 */
const DEFAULT_PRIMARY = '#1E5DAB';
const DEFAULT_SECONDARY = '#F4A623';

const IdentidadVisualPage = () => {
    // Datos persistidos
    const [persisted, setPersisted] = useState({});

    // Form en edición (preview se calcula desde aquí)
    const [draft, setDraft] = useState({
        primaryColor: DEFAULT_PRIMARY,
        secondaryColor: DEFAULT_SECONDARY,
        brandName: '',
        logoData: null,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [contrast, setContrast] = useState({ ratio: 21, wcagAA: true });

    useEffect(() => { load(); }, []);

    useEffect(() => {
        // Cálculo en vivo del contraste cada vez que cambia primaryColor
        const ratio = wcagContrast(draft.primaryColor, '#FFFFFF');
        setContrast({ ratio: Math.round(ratio * 100) / 100, wcagAA: ratio >= 4.5 });
    }, [draft.primaryColor]);

    const load = async () => {
        setLoading(true);
        try {
            const resp = await fetchHelper.get(base_url(['api', 'parametrization', 'brand-config']));
            const cfg = (resp?.data) || {};
            setPersisted(cfg);
            setDraft({
                primaryColor: cfg.primaryColor || DEFAULT_PRIMARY,
                secondaryColor: cfg.secondaryColor || DEFAULT_SECONDARY,
                brandName: cfg.brandName || '',
                logoData: cfg.logoData || null,
            });
            // Bloque AM (2026-05-03): aplicar el theme al cargar (no solo al Guardar)
            // para que el preview/CSS vars reflejen lo persistido en BD.
            applyThemeToDocument({
                primaryColor: cfg.primaryColor || DEFAULT_PRIMARY,
                secondaryColor: cfg.secondaryColor || DEFAULT_SECONDARY,
                brandName: cfg.brandName,
                logoData: cfg.logoData,
            });
        } catch (e) {
            setNotification({ type: 'danger', text: 'Error cargando identidad visual: ' + (e?.msg || e?.message || 'desconocido') });
        } finally {
            setLoading(false);
        }
    };

    const handleColorChange = (field, value) => {
        setDraft({ ...draft, [field]: value });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const okMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!okMime.includes(file.type)) {
            setNotification({ type: 'danger', text: 'El logo debe ser PNG transparente, JPG o SVG' });
            return;
        }
        if (file.size > 500_000) {
            setNotification({ type: 'danger', text: 'El archivo excede el tamaño máximo permitido (500KB)' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setDraft({ ...draft, logoData: reader.result });
            setNotification({ type: 'info', text: 'Logo cargado en preview. Presione Guardar para persistir.' });
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                primaryColor: draft.primaryColor,
                secondaryColor: draft.secondaryColor,
                brandName: draft.brandName,
            };
            if (draft.logoData && draft.logoData.startsWith('data:')) body.logoData = draft.logoData;
            const resp = await fetchHelper.put(base_url(['api', 'parametrization', 'brand-config']), body);
            setPersisted(resp?.data || body);
            setNotification({ type: 'success', text: resp?.message || 'Identidad visual guardada' });
            // E1: aplicar al instante en la sesion (no requiere refresh)
            applyThemeToDocument(draft);
        } catch (e) {
            setNotification({ type: 'danger', text: e?.msg || e?.message || 'Error guardando' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('¿Restablecer la identidad visual al theme default de SIGCON?')) return;
        try {
            await fetchHelper.del(base_url(['api', 'parametrization', 'brand-config']));
            setDraft({ primaryColor: DEFAULT_PRIMARY, secondaryColor: DEFAULT_SECONDARY, brandName: '', logoData: null });
            setPersisted({});
            setNotification({ type: 'success', text: 'Identidad visual reseteada al default' });
            applyThemeToDocument({ primaryColor: DEFAULT_PRIMARY, secondaryColor: DEFAULT_SECONDARY });
        } catch (e) {
            setNotification({ type: 'danger', text: e?.msg || 'Error al resetear' });
        }
    };

    const handleCancel = () => {
        // Vuelve a los datos persistidos (descarta cambios sin guardar)
        setDraft({
            primaryColor: persisted.primaryColor || DEFAULT_PRIMARY,
            secondaryColor: persisted.secondaryColor || DEFAULT_SECONDARY,
            brandName: persisted.brandName || '',
            logoData: persisted.logoData || null,
        });
        setNotification({ type: 'info', text: 'Cambios descartados' });
    };

    if (loading) {
        return <div className="card"><div className="card-body text-center p-5"><div className="spinner-border text-primary" /></div></div>;
    }

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="ri-palette-line me-2"></i>Identidad Visual de la Empresa</h5>
                <small className="text-muted">HU-PA-BRAND-01</small>
            </div>

            <div className="card-body">
                {notification && (
                    <div className={`alert alert-${notification.type} alert-dismissible`}>
                        {notification.text}
                        <button className="btn-close" onClick={() => setNotification(null)}></button>
                    </div>
                )}

                <div className="row">
                    {/* ----- FORM ----- */}
                    <div className="col-lg-5">
                        <h6>Configuración</h6>

                        <div className="mb-3">
                            <label className="form-label">Nombre Comercial</label>
                            <input type="text" className="form-control"
                                value={draft.brandName}
                                onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
                                placeholder="Ej: ACME Soluciones SAS" />
                        </div>

                        <div className="row mb-3">
                            <div className="col-6">
                                <label className="form-label">Color Primario</label>
                                <div className="d-flex align-items-center">
                                    <input type="color" className="form-control form-control-color me-2"
                                        value={draft.primaryColor}
                                        onChange={(e) => handleColorChange('primaryColor', e.target.value)} />
                                    <input type="text" className="form-control" value={draft.primaryColor}
                                        onChange={(e) => handleColorChange('primaryColor', e.target.value)} />
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="form-label">Color Secundario</label>
                                <div className="d-flex align-items-center">
                                    <input type="color" className="form-control form-control-color me-2"
                                        value={draft.secondaryColor}
                                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)} />
                                    <input type="text" className="form-control" value={draft.secondaryColor}
                                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Indicador WCAG AA en vivo (HU-BRAND-01 E2) */}
                        <div className={`alert ${contrast.wcagAA ? 'alert-success' : 'alert-warning'} py-2`}>
                            <strong>Contraste {contrast.ratio}:1</strong>{' '}
                            {contrast.wcagAA
                                ? '✓ Cumple WCAG AA (mínimo 4.5:1)'
                                : `⚠ NO cumple WCAG AA. Mínimo requerido 4.5:1. Ajuste el color o el texto`}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Logo (PNG / JPG / SVG, máx 500KB)</label>
                            <input type="file" className="form-control" accept="image/png,image/jpeg,image/svg+xml"
                                onChange={handleLogoUpload} />
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <Button type="primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                            <Button type="secondary" onClick={handleCancel}>Cancelar</Button>
                            <Button type="danger" onClick={handleReset}>Restablecer Default</Button>
                        </div>
                    </div>

                    {/* ----- LIVE PREVIEW (HU-BRAND-01 E4) -----
                        Bloque AM (2026-05-03): el preview mostraba el sidebar con
                        fondo solido del primaryColor, lo cual NO refleja el chrome
                        real del template Sneat. El sidebar real tiene fondo blanco
                        (claro) con el logo+brandName en color primario y los menus
                        en gris oscuro. Aqui replicamos exactamente esa estetica
                        para que el preview sea fiel a lo que el contador vera. */}
                    <div className="col-lg-7">
                        <h6>Vista Previa en Tiempo Real</h6>
                        <div className="border rounded overflow-hidden" style={{ minHeight: 360 }}>
                            {/* Mini sidebar — fiel al chrome real (fondo blanco, accent primary) */}
                            <div className="d-flex" style={{ minHeight: 360 }}>
                                <div style={{
                                    width: 200,
                                    backgroundColor: '#F7F7F9', /* exact match con bg-menu-theme del template Sneat */
                                    borderRight: '1px solid #E7E7E7',
                                    color: '#3B4056', /* exact match texto del sidebar real */
                                    padding: 12
                                }}>
                                    <div className="d-flex align-items-center" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E7E7E7' }}>
                                        {draft.logoData ? (
                                            <img src={draft.logoData} alt="logo"
                                                 style={{ maxHeight: 36, maxWidth: 36, objectFit: 'contain', marginRight: 8 }} />
                                        ) : (
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: draft.primaryColor,
                                                color: '#FFFFFF',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 16, fontWeight: 'bold', marginRight: 8
                                            }}>{(draft.brandName || 'S').charAt(0).toUpperCase()}</div>
                                        )}
                                        <strong style={{ color: draft.primaryColor, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {draft.brandName || 'Mi Empresa'}
                                        </strong>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, color: '#3B4056' }}>
                                        <li style={{ padding: '6px 8px', borderRadius: 4 }}>📊 Dashboard</li>
                                        <li style={{
                                            padding: '6px 8px', borderRadius: 4,
                                            background: draft.primaryColor,
                                            color: '#FFFFFF',
                                            fontWeight: 500
                                        }}>📑 Comprobantes</li>
                                        <li style={{ padding: '6px 8px', borderRadius: 4 }}>👥 Terceros</li>
                                        <li style={{ padding: '6px 8px', borderRadius: 4 }}>🏦 Bancos</li>
                                    </ul>
                                </div>

                                {/* Contenido */}
                                <div className="flex-grow-1 p-3" style={{ background: '#F8F9FA' }}>
                                    {/* Header */}
                                    <div style={{
                                        background: '#FFFFFF', padding: 10, borderRadius: 4,
                                        borderLeft: `4px solid ${draft.primaryColor}`,
                                        marginBottom: 12, fontSize: 14
                                    }}>
                                        <strong>{draft.brandName || 'Mi Empresa'}</strong> — Panel de control
                                    </div>

                                    {/* Card de ejemplo */}
                                    <div className="card mb-3">
                                        <div className="card-body p-3">
                                            <h6 style={{ color: draft.primaryColor }}>Factura FV-2026000123</h6>
                                            <p className="mb-2" style={{ fontSize: 13 }}>Cliente: Ejemplo S.A.S.</p>
                                            <button className="btn btn-sm" style={{
                                                backgroundColor: draft.primaryColor,
                                                color: '#FFFFFF',
                                                border: 'none'
                                            }}>Ver Detalle</button>{' '}
                                            <button className="btn btn-sm" style={{
                                                backgroundColor: draft.secondaryColor,
                                                color: '#FFFFFF',
                                                border: 'none'
                                            }}>Imprimir</button>
                                        </div>
                                    </div>

                                    {/* Preview "PDF de ejemplo" */}
                                    <div style={{
                                        background: '#FFF',
                                        border: '1px solid #DDD',
                                        padding: 12,
                                        fontSize: 11
                                    }}>
                                        <div style={{ borderBottom: `2px solid ${draft.primaryColor}`, paddingBottom: 6, marginBottom: 6 }}>
                                            {draft.logoData && <img src={draft.logoData} alt="logo" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />}
                                            <strong style={{ color: draft.primaryColor }}>{draft.brandName || 'EMPRESA EJEMPLO'}</strong>
                                        </div>
                                        <div>NIT 900.000.000-0 — Documento exportado</div>
                                        <div style={{ marginTop: 6 }}>Total: <strong>$1,165,000</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <small className="text-muted">El preview se actualiza al instante. El cambio se aplica al sistema solo al hacer click en Guardar.</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ----- helpers de contraste WCAG (W3C) -----
function wcagContrast(hex1, hex2) {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex) {
    const [r, g, b] = parseHex(hex);
    const rs = sRgbToLinear(r / 255);
    const gs = sRgbToLinear(g / 255);
    const bs = sRgbToLinear(b / 255);
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function sRgbToLinear(c) {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseHex(hex) {
    const h = hex.startsWith('#') ? hex.substring(1) : hex;
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [
        parseInt(full.substring(0, 2), 16),
        parseInt(full.substring(2, 4), 16),
        parseInt(full.substring(4, 6), 16),
    ];
}

/**
 * QA-2026-05-05: scope la cache de theme por empresa para evitar bleed
 * cross-tenant. Antes la clave era 'sigcon_brand_theme' global, asi que
 * cuando un mismo navegador hacia login en empresa A (rojo) y luego en
 * empresa B (verde), el chrome mostraba el rojo de A hasta que el usuario
 * abria la pagina Identidad Visual y el load() refrescaba el cache.
 */
function brandStorageKey() {
    try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
            const u = JSON.parse(userRaw);
            if (u?.companyId) return `sigcon_brand_theme_${u.companyId}`;
        }
    } catch (_) { /* ignore */ }
    return 'sigcon_brand_theme'; // fallback (sesion sin tenant: PLATFORM_ADMIN)
}

function applyThemeToDocument(cfg) {
    // Aplica al CSS var del documento. El componente padre (templates/MainTemplate)
    // puede leer estas vars para su sidebar/header reales.
    const primary = cfg.primaryColor || DEFAULT_PRIMARY;
    const secondary = cfg.secondaryColor || DEFAULT_SECONDARY;
    const root = document.documentElement;
    // Custom vars para sidebar/header del template Sneat
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-secondary', secondary);
    // Bloque AM (2026-05-03): sobreescribir tambien las CSS vars de Bootstrap
    // y del template Sneat (config.js usa --config-primary y derivadas:
    // hover/label/focus/dark) para que sidebar, navbar, avatar, botones y
    // badges tomen el color al instante sin recargar.
    root.style.setProperty('--bs-primary', primary);
    root.style.setProperty('--bs-primary-rgb', hexToRgb(primary));
    root.style.setProperty('--bs-secondary', secondary);
    root.style.setProperty('--bs-secondary-rgb', hexToRgb(secondary));
    root.style.setProperty('--config-primary', primary);
    root.style.setProperty('--config-primary-rgb', hexToRgb(primary));
    root.style.setProperty('--config-primary-label', lightenHex(primary, 90));
    root.style.setProperty('--config-primary-hover', lightenHex(primary, -20));
    root.style.setProperty('--config-primary-focus', lightenHex(primary, 70));
    root.style.setProperty('--config-dark-primary', lightenHex(primary, -30));
    // Persistir en localStorage para que sobreviva refresh y navegacion.
    // Scope por companyId para evitar bleed cross-tenant (QA 2026-05-05).
    try {
        localStorage.setItem(brandStorageKey(), JSON.stringify({
            primaryColor: primary,
            secondaryColor: secondary,
            brandName: cfg.brandName ?? null,
            logoData: cfg.logoData ?? null,
            savedAt: new Date().toISOString(),
        }));
    } catch (_) { /* localStorage lleno o disabled */ }
}

function lightenHex(hex, percent) {
    // percent positivo aclara, negativo oscurece. Replica window.lightenColor.
    const h = hex?.startsWith('#') ? hex.substring(1) : (hex || '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    if (full.length !== 6) return hex || DEFAULT_PRIMARY;
    let r = parseInt(full.substring(0, 2), 16);
    let g = parseInt(full.substring(2, 4), 16);
    let b = parseInt(full.substring(4, 6), 16);
    const factor = percent / 100;
    if (factor >= 0) {
        r = Math.round(r + (255 - r) * factor);
        g = Math.round(g + (255 - g) * factor);
        b = Math.round(b + (255 - b) * factor);
    } else {
        r = Math.round(r * (1 + factor));
        g = Math.round(g * (1 + factor));
        b = Math.round(b * (1 + factor));
    }
    const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex) {
    const h = hex?.startsWith('#') ? hex.substring(1) : (hex || '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    if (full.length !== 6) return '30, 93, 171';
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export default IdentidadVisualPage;
