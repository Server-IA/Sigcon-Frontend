import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AlertPage from '../../../components/molecules/AlertPage';
import VerificationDetailModal from './VerificationDetailModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Mapa de severidad ────────────────────────────────────────────────────────
const SEVERITY = {
    CUMPLE: { badge: 'bg-label-success', label: 'Cumple' },
    ADVERTENCIA: { badge: 'bg-label-warning', label: 'Advertencia' },
    INCUMPLE: { badge: 'bg-label-danger', label: 'Incumple' },
};

// ─── Helper: ruta dinámica de corrección ─────────────────────────────────────
const buildMenuPath = (menu, parentPath = '') => {
    const rawPath = menu?.path ?? menu?.url ?? '';
    return rawPath ? `/${[parentPath, rawPath].filter(Boolean).join('/')}` : `/${parentPath}`;
};
const findCorrectionPath = (modules) => {
    for (const mod of (modules ?? [])) {
        const rootPath = mod?.url ?? '';
        const search = (menus, parent) => {
            for (const menu of (menus ?? [])) {
                const fullPath = buildMenuPath(menu, parent);
                if (menu.componentName === 'NIIF_CORRECTION') return fullPath;
                if (menu.childrens?.length) {
                    const found = search(menu.childrens, fullPath.replace(/^\//, ''));
                    if (found) return found;
                }
            }
            return null;
        };
        const found = search(mod.menus ?? [], rootPath);
        if (found) return found;
    }
    return null;
};

// ─── Helpers búsqueda DataTable ───────────────────────────────────────────────
/**
 * Construye el payload estándar para el endpoint /assets/search
 * columns: busca por assetCode y name; search.value: término del usuario
 */
const buildSearchPayload = (term) => ({
    draw: 1,
    start: 0,
    length: 50,
    columns: [
        { data: 'assetCode', name: 'assetCode', searchable: true, orderable: true, search: { value: '', regex: false } },
    ],
    search: { value: term, regex: false },
});

// ─── Componente principal ─────────────────────────────────────────────────────
const NiifVerificationIndex = () => {
    const navigate = useNavigate();
    const modules = useSelector(state => state.modules?.modules ?? []);

    // ── Búsqueda de activos ───────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [assetsList, setAssetsList] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const searchTimeout = useRef(null);

    // ── Selección ─────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(new Set());

    // ── Verificación ──────────────────────────────────────────────────
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);

    const detailModalRef = useRef(null);
    const detailModalInstance = useRef(null);

    // ── Búsqueda con debounce ─────────────────────────────────────────
    const doSearch = useCallback(async (term) => {
        if (!term.trim()) {
            setAssetsList([]);
            setSearchError('');
            return;
        }
        setIsSearching(true);
        setSearchError('');
        try {
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'assets', 'search']),
                buildSearchPayload(term.trim()),
                {},
                8000
            );
            const items = response?.data ?? [];
            setAssetsList(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error('Error buscando activos:', err);
            setSearchError('No se pudieron cargar los activos. Verifique su conexión.');
            setAssetsList([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => doSearch(searchTerm), 400);
        return () => clearTimeout(searchTimeout.current);
    }, [searchTerm, doSearch]);

    // ── Toggle selección ──────────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === assetsList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(assetsList.map(a => a.id)));
        }
    };

    // ── Verificar activos seleccionados ───────────────────────────────
    const handleVerify = async () => {
        if (selectedIds.size === 0) {
            setErrorMessage('Seleccione al menos un activo para verificar.');
            return;
        }
        setErrorMessage('');
        setIsVerifying(true);
        setShowSuccess(false);

        try {
            const assetIds = Array.from(selectedIds);
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'niif-alerts', 'verify']),
                { assetIds },
                {},
                10000
            );

            const data = response?.data ?? response ?? [];
            const alerts = Array.isArray(data) ? data : [data];
            setResults(prev => [...alerts, ...prev]);
            setShowSuccess(true);
            setSelectedIds(new Set());

        } catch (err) {
            console.error('Error en verificación NIIF:', err);
            const serverMsg = err?.message ?? err?.msg ?? '';
            if (err?.status === 400 || serverMsg) {
                setErrorMessage(serverMsg || 'Solicitud inválida. Verifique los activos seleccionados.');
            } else if (err?.status === 500) {
                setErrorMessage('Error interno del servidor. No se pudo procesar la verificación NIIF.');
            } else {
                setErrorMessage('No se pudo procesar la verificación NIIF. Intente nuevamente o revise la configuración de parámetros.');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    // ── Modal detalle ─────────────────────────────────────────────────
    const openDetail = (result) => {
        setSelectedResult(result);
        if (!detailModalInstance.current) {
            detailModalInstance.current = new window.bootstrap.Modal(detailModalRef.current);
        }
        detailModalInstance.current.show();
    };

    const goToCorrection = (result) => {
        const dynamicPath = findCorrectionPath(modules);
        navigate(dynamicPath ?? '/niif/correccion', { state: { result } });
    };

    const handleGoToCorrection = (result) => {
        detailModalInstance.current?.hide();
        goToCorrection(result);
    };

    // ── Exportar CSV ──────────────────────────────────────────────────
    const handleExport = () => {
        const header = ['ID Activo', 'Nombre', 'Norma', 'Estado', 'Fecha'];
        const rows = results.map(r => [
            r.assetId ?? r.assetCode ?? '-',
            r.assetName ?? '-',
            r.applicableNorm ?? '-',
            r.overallStatus ?? '-',
            r.verifiedAt ?? '-',
        ]);
        const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `niif_verificacion_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const allSelected = assetsList.length > 0 && selectedIds.size === assetsList.length;

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════
                CARD — Búsqueda y selección de activos
            ════════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title fw-bold mb-1">Verificación Cumplimiento de NIIF</h5>
                        <p className="text-muted mb-4" style={{ fontSize: '0.82rem' }}>
                            Busque y seleccione los activos a analizar. El sistema consultará su cumplimiento
                            según las normas NIIF aplicables (NIIF 16, NIC 16, NIC 36, NIC 38).
                        </p>

                        <AlertPage
                            type="success"
                            message="Verificación NIIF ejecutada correctamente."
                            show={showSuccess}
                            onChange={() => setShowSuccess(false)}
                        />

                        {/* ── Buscador ── */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <label className="form-label fw-semibold" style={{ fontSize: '0.875rem' }}>
                                    Buscar activo por código o nombre
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        {isSearching
                                            ? <span className="spinner-border spinner-border-sm" role="status" />
                                            : <i className="ri-search-line" />}
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ej. ACT-001 o Computador"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        aria-label="Buscar activo"
                                    />
                                    {searchTerm && (
                                        <button
                                            className="btn btn-outline-secondary"
                                            type="button"
                                            onClick={() => { setSearchTerm(''); setAssetsList([]); setSelectedIds(new Set()); }}
                                            title="Limpiar búsqueda"
                                        >
                                            <i className="ri-close-line" />
                                        </button>
                                    )}
                                </div>
                                {searchError && (
                                    <small className="text-danger mt-1 d-block">
                                        <i className="ri-error-warning-line me-1" />{searchError}
                                    </small>
                                )}
                            </div>
                        </div>

                        {/* ── Lista de activos encontrados ── */}
                        {assetsList.length > 0 && (
                            <div className="table-responsive mb-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                <table className="table table-hover table-sm mb-0">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={allSelected}
                                                    onChange={toggleAll}
                                                    title="Seleccionar todos"
                                                />
                                            </th>
                                            <th>Código</th>
                                            <th>Nombre</th>
                                            <th>Clasificación</th>
                                            <th>Vida útil (meses)</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assetsList.map(asset => (
                                            <tr
                                                key={asset.id}
                                                className={selectedIds.has(asset.id) ? 'table-primary' : ''}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => toggleSelect(asset.id)}
                                            >
                                                <td onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedIds.has(asset.id)}
                                                        onChange={() => toggleSelect(asset.id)}
                                                    />
                                                </td>
                                                <td><small className="fw-semibold">{asset.assetCode ?? '-'}</small></td>
                                                <td><small>{asset.name ?? '-'}</small></td>
                                                <td>
                                                    <small>
                                                        {asset.classification === 'NON_CURRENT' ? 'No corriente'
                                                            : asset.classification === 'CURRENT' ? 'Corriente'
                                                                : (asset.classification ?? '-')}
                                                    </small>
                                                </td>
                                                <td><small>{asset.usefulLifeMonths ?? '-'}</small></td>
                                                <td><small>{asset.status ?? '-'}</small></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {searchTerm && !isSearching && assetsList.length === 0 && !searchError && (
                            <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                                <i className="ri-information-line me-1" />
                                No se encontraron activos para <strong>"{searchTerm}"</strong>.
                            </p>
                        )}

                        {/* ── Resumen selección ── */}
                        {selectedIds.size > 0 && (
                            <div className="alert alert-primary d-flex align-items-center gap-2 py-2 mb-3">
                                <i className="ri-checkbox-multiple-line" />
                                <small>
                                    <strong>{selectedIds.size}</strong> activo(s) seleccionado(s) para verificar.
                                </small>
                            </div>
                        )}

                        {/* ── Error ── */}
                        {errorMessage && (
                            <div className="d-flex align-items-center gap-2 mb-3" style={{ color: '#d32f2f', fontSize: '0.82rem' }}>
                                <i className="ri-error-warning-line" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* ── Botones ── */}
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleVerify}
                                disabled={isVerifying || selectedIds.size === 0}
                            >
                                {isVerifying
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Verificando...</>
                                    : <><i className="ri-shield-check-line me-1" />Verificar NIIF ({selectedIds.size})</>}
                            </button>
                            {results.length > 0 && (
                                <button type="button" className="btn btn-outline-secondary" onClick={handleExport}>
                                    <i className="ri-download-line me-1" />Exportar CSV
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                RESULTADOS — Respuesta del servidor
            ════════════════════════════════════════════════════════════════ */}
            {results.length > 0 && (
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                            <h6 className="mb-0 fw-bold">Resultados de Verificación NIIF</h6>
                            <div className="d-flex gap-2 align-items-center">
                                <span className="badge bg-label-primary">{results.length} verificación(es)</span>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setResults([])}
                                    title="Limpiar resultados"
                                >
                                    <i className="ri-delete-bin-line me-1" />Limpiar
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Activo</th>
                                        <th>Norma</th>
                                        <th>Estado</th>
                                        <th>Fecha Verificación</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((r, idx) => {
                                        const status = r.overallStatus ?? r.status ?? 'CUMPLE';
                                        const cfg = SEVERITY[status] ?? SEVERITY.CUMPLE;
                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                                                        {r.assetName ?? `Activo #${r.assetId ?? idx + 1}`}
                                                    </div>
                                                    <small className="text-muted">{r.assetCode ?? r.assetId ?? '-'}</small>
                                                </td>
                                                <td><small>{r.applicableNorm ?? '-'}</small></td>
                                                <td><span className={`badge ${cfg.badge}`}>{cfg.label}</span></td>
                                                <td><small className="text-muted">{r.verifiedAt ?? new Date().toLocaleString('es-CO')}</small></td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <button
                                                            className="btn btn-sm btn-label-primary"
                                                            title="Ver detalle"
                                                            onClick={() => openDetail(r)}
                                                        >
                                                            <i className="ri-eye-line" />
                                                        </button>
                                                        {status !== 'CUMPLE' && (
                                                            <button
                                                                className="btn btn-sm btn-label-warning"
                                                                title="Ir a corrección NIIF"
                                                                onClick={() => goToCorrection(r)}
                                                            >
                                                                <i className="ri-tools-line" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de detalle ── */}
            <VerificationDetailModal
                modalRef={detailModalRef}
                result={selectedResult}
                onGoToCorrection={handleGoToCorrection}
            />
        </>
    );
};

export default NiifVerificationIndex;
