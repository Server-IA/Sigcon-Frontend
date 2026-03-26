import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AlertPage from '../../../components/molecules/AlertPage';
import DataTableReference from '../../../components/organism/DataTable';
import VerificationDetailModal from './VerificationDetailModal';
import AssetSearch from '../niif_correction/AssetSearch';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Mapa de severidad para badges ───────────────────────────────────────────
const SEVERITY = {
    CUMPLE:        { badge: 'bg-label-success', label: 'Cumple' },
    COMPLIANT:     { badge: 'bg-label-success', label: 'Cumple' },
    ADVERTENCIA:   { badge: 'bg-label-warning', label: 'Advertencia' },
    WARNING:       { badge: 'bg-label-warning', label: 'Advertencia' },
    INCUMPLE:      { badge: 'bg-label-danger',  label: 'Incumple' },
    NON_COMPLIANT: { badge: 'bg-label-danger',  label: 'Incumple' },
};

const resolveBadge = (status) =>
    SEVERITY[status] ?? SEVERITY[String(status ?? '').toUpperCase()] ?? SEVERITY.CUMPLE;

// ─── Helper: encontrar la ruta NIIF_CORRECTION en el menú dinámico ───────────
const buildMenuPath = (menu, parentPath = '') => {
    const rawPath = menu?.path ?? menu?.url ?? '';
    return rawPath
        ? `/${[parentPath, rawPath].filter(Boolean).join('/')}`
        : `/${parentPath}`;
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

// ─── Columnas para DataTable ─────────────────────────────────────────────────
const buildColumns = (onDetail, onCorrection) => [
    {
        title: 'Código Activo',
        data: 'assetCode',
        name: 'assetCode',
        render: (v, _t, row) => v ?? row.assetId ?? '-',
    },
    {
        title: 'Nombre',
        data: 'assetName',
        name: 'assetName',
        render: (v, _t, row) => v ?? row.name ?? row.asset?.name ?? '-',
    },
    {
        title: 'Norma',
        data: 'applicableNorm',
        name: 'applicableNorm',
        render: (v, _t, row) => v ?? row.norm ?? row.niifNorm ?? '-',
    },
    {
        title: 'Estado',
        data: 'overallStatus',
        name: 'overallStatus',
        render: (v, _t, row) => {
            const status = v ?? row.status ?? row.complianceStatus ?? 'CUMPLE';
            const cfg = resolveBadge(status);
            return `<span class="badge ${cfg.badge}">${cfg.label}</span>`;
        },
    },
    {
        title: 'Fecha Verificación',
        data: 'verifiedAt',
        name: 'verifiedAt',
        render: (v) => v ? new Date(v).toLocaleString('es-CO') : new Date().toLocaleString('es-CO'),
    },
    {
        title: 'Acciones',
        data: null,
        searchable: false,
        orderable: false,
        render: (_v, _t, row) => {
            const status = row.overallStatus ?? row.status ?? 'CUMPLE';
            const corrBtn = (status !== 'CUMPLE' && status !== 'COMPLIANT')
                ? `<button class="btn btn-sm btn-label-warning ms-1 niif-action-btn" data-action="correction" title="Ir a corrección NIIF">
                       <i class="ri-tools-line"></i>
                   </button>`
                : '';
            return `<div class="d-flex align-items-center">
                <button class="btn btn-sm btn-label-primary niif-action-btn" data-action="detail" title="Ver detalle">
                    <i class="ri-eye-line"></i>
                </button>
                ${corrBtn}
            </div>`;
        },
    },
];

// ─── Componente principal ────────────────────────────────────────────────────
const NiifVerificationIndex = () => {
    const navigate = useNavigate();
    const modules  = useSelector(state => state.modules?.modules ?? []);

    // Lista de activos seleccionados para verificar
    const [selectedAssets, setSelectedAssets] = useState([]);

    // Estado UI
    const [errorMessage,   setErrorMessage]   = useState('');
    const [isVerifying,    setIsVerifying]     = useState(false);
    const [showSuccess,    setShowSuccess]     = useState(false);
    const [results,        setResults]         = useState([]);
    const [selectedResult, setSelectedResult]  = useState(null);
    const [search,         setSearch]          = useState({ value: '', checked: true });

    // Refs DataTable
    const tableRef     = useRef(null);
    const dataTableRef = useRef(null);

    const detailModalRef      = useRef(null);
    const detailModalInstance = useRef(null);

    // ── Agregar activo a la lista ─────────────────────────────────────
    const handleAddAsset = (asset) => {
        if (!asset) return;
        if (selectedAssets.some(a => a.id === asset.id)) return;
        setSelectedAssets(prev => [...prev, asset]);
        setErrorMessage('');
    };

    const handleRemoveAsset = (assetId) => {
        setSelectedAssets(prev => prev.filter(a => a.id !== assetId));
    };

    // ── Verificar ─────────────────────────────────────────────────────
    const handleVerify = async () => {
        if (selectedAssets.length === 0) {
            setErrorMessage('Seleccione al menos un activo para verificar');
            return;
        }
        setErrorMessage('');
        setIsVerifying(true);
        setShowSuccess(false);

        try {
            const assetIds = selectedAssets.map(a => Number(a.id)).filter(n => n > 0);
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'niif-alerts', 'verify']),
                { assetIds },
                {},
                10000
            );

            const data   = response?.data ?? response ?? [];
            const alerts = Array.isArray(data) ? data : [data];

            setResults(prev => [...alerts, ...prev]);
            setShowSuccess(true);

        } catch (err) {
            console.error('Error en verificación NIIF:', err);
            const serverMsg = err?.message ?? err?.msg ?? '';
            if (err?.status === 400 || serverMsg) {
                setErrorMessage(serverMsg || 'Solicitud inválida. Verifique los activos seleccionados.');
            } else if (err?.status === 500) {
                setErrorMessage('Error interno del servidor. No se pudo procesar la verificación NIIF.');
            } else {
                setErrorMessage('No se pudo procesar la verificación NIIF. Intente nuevamente.');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    // ── Modal de detalle ──────────────────────────────────────────────
    const openDetail = (result) => {
        setSelectedResult(result);
        if (!detailModalInstance.current) {
            detailModalInstance.current = new window.bootstrap.Modal(detailModalRef.current);
        }
        detailModalInstance.current.show();
    };

    // ── Navegar a Corrección NIIF ─────────────────────────────────────
    const goToCorrection = (result) => {
        const dynamicPath = findCorrectionPath(modules);
        navigate(dynamicPath ?? '/niif/correccion', { state: { result } });
    };

    const handleGoToCorrection = (result) => {
        detailModalInstance.current?.hide();
        goToCorrection(result);
    };

    // ── Columnas con callbacks ────────────────────────────────────────
    const columns = buildColumns(openDetail, goToCorrection);

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════
                CARD — Verificación
            ════════════════════════════════════════════════════════════════ */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title fw-bold mb-1">Verificación Cumplimiento de NIIF</h5>
                        <p className="text-muted mb-4" style={{ fontSize: '0.82rem' }}>
                            Seleccione uno o varios activos para analizar su cumplimiento según las normas NIIF aplicables
                            (NIIF 16, NIC 16, NIC 36, NIC 38).
                        </p>

                        <AlertPage
                            type="success"
                            message="Verificación NIIF ejecutada correctamente."
                            show={showSuccess}
                            onChange={() => setShowSuccess(false)}
                        />

                        {/* ── Buscador de activos ── */}
                        <div className="row">
                            <div className="col-12 mb-3">
                                <AssetSearch
                                    onSelect={handleAddAsset}
                                    selectedAsset={null}
                                    error={selectedAssets.length === 0 && errorMessage ? errorMessage : undefined}
                                    required
                                />
                                <small className="text-muted">
                                    Busque y añada uno o más activos. Pulse <strong>Verificar</strong> cuando esté listo.
                                </small>
                            </div>
                        </div>

                        {/* ── Badges de activos seleccionados ── */}
                        {selectedAssets.length > 0 && (
                            <div className="mb-3">
                                <p className="fw-semibold mb-2" style={{ fontSize: '0.85rem' }}>
                                    Activos a verificar ({selectedAssets.length}):
                                </p>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedAssets.map(asset => (
                                        <span
                                            key={asset.id}
                                            className="badge bg-label-primary d-inline-flex align-items-center gap-1"
                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                                        >
                                            <i className="ri-box-3-line" />
                                            <span>{asset.assetCode ?? `ID: ${asset.id}`}</span>
                                            {asset.name && <span className="opacity-75">— {asset.name}</span>}
                                            <button
                                                type="button"
                                                className="btn-close btn-close-sm ms-1"
                                                style={{ fontSize: '0.6rem' }}
                                                onClick={() => handleRemoveAsset(asset.id)}
                                                title="Quitar activo"
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Error de API (cuando hay activos seleccionados) ── */}
                        {errorMessage && selectedAssets.length > 0 && (
                            <div className="d-flex align-items-center gap-2 mb-3" style={{ color: '#d32f2f', fontSize: '0.82rem' }}>
                                <i className="ri-error-warning-line" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* ── Botón Verificar ── */}
                        <div className="d-flex gap-2 mt-2">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleVerify}
                                disabled={isVerifying || selectedAssets.length === 0}
                            >
                                {isVerifying
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Verificando...</>
                                    : `Verificar${selectedAssets.length > 0 ? ` (${selectedAssets.length})` : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                RESULTADOS — DataTable con exportación integrada
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
                                    onClick={() => { setResults([]); dataTableRef.current?.clear().draw(); }}
                                    title="Limpiar resultados"
                                >
                                    <i className="ri-delete-bin-line me-1" />Limpiar
                                </button>
                            </div>
                        </div>
                        <div className="card-datatable text-nowrap">

                            {/* DataTable con botón de exportación (Excel / CSV / PDF) */}
                            <NiifResultsTable
                                results={results}
                                columns={columns}
                                tableRef={tableRef}
                                dataTableRef={dataTableRef}
                                search={search}
                                setSearch={setSearch}
                                onDetail={openDetail}
                                onCorrection={goToCorrection}
                            />
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

// ─── Subcomponente: DataTable de resultados ───────────────────────────────────
// Separado para que el useEffect del DataTable se dispare al montar, no al añadir resultados

const NiifResultsTable = ({ results, columns, tableRef, dataTableRef, search, setSearch, onDetail, onCorrection }) => {

    // Enlazar los botones de acción del DataTable a los handlers React
    useEffect(() => {
        const table = tableRef?.current;
        if (!table) return;

        const handler = function (e) {
            const btn   = e.target.closest('.niif-action-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            const rowIdx = $(btn).closest('tr');
            const rowData = dataTableRef.current?.row(rowIdx).data();
            if (!rowData) return;
            if (action === 'detail')     onDetail(rowData);
            if (action === 'correction') onCorrection(rowData);
        };
        table.addEventListener('click', handler);
        return () => table.removeEventListener('click', handler);
    }, [results]);

    return (
        <DataTableReference
            url_api={['api', 'v1', 'niif-alerts', 'verify']}
            columns={columns}
            tableRef={tableRef}
            dataTableRef={dataTableRef}
            method="POST"
            buttons={[]}
            title="Verificacion NIIF"
            exportMethod="POST"
            search={search}
            setSearch={setSearch}
            filtered={true}
            data={results}
        />
    );
};

export default NiifVerificationIndex;
