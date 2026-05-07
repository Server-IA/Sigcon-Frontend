import { useState, useEffect } from 'react';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const ViewBankAccount = ({
    modalRef,
    record,
    setRecord,
    accountTypes,
    statusLabels,
    statusBadge,
}) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');

    // Cargar detalle completo al abrir el modal
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        const onShow = async () => {
            if (!record.id) return;
            setLoading(true);
            setFetchError('');
            setDetail(null);
            try {
                const res = await fetchHelper.get(
                    base_url(['api', 'v1', 'bank-accounts', record.id]),
                    {}, 1
                );
                setDetail(res.data || res);
            } catch (err) {
                setFetchError(err?.msg || 'No se pudo cargar el detalle de la cuenta.');
            } finally {
                setLoading(false);
            }
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef, record.id]);

    const Row = ({ label, value }) => (
        <div className="col-md-4 mb-3">
            <small className="text-muted d-block">{label}</small>
            <span className="fw-semibold">{value ?? <span className="text-muted">—</span>}</span>
        </div>
    );

    const BoolRow = ({ label, value }) => (
        <div className="col-md-4 mb-3">
            <small className="text-muted d-block">{label}</small>
            <span className={`badge ${value ? 'bg-label-success' : 'bg-label-secondary'}`}>
                {value ? 'Sí' : 'No'}
            </span>
        </div>
    );

    const d = detail;

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-eye-line me-2"></i>Detalle de Cuenta Bancaria
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div className="modal-body">
                        {loading && (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Cargando...</span>
                                </div>
                                <p className="mt-2 text-muted">Cargando detalle...</p>
                            </div>
                        )}

                        {fetchError && !loading && (
                            <div className="alert alert-danger">
                                <i className="ri-error-warning-line me-2"></i>{fetchError}
                            </div>
                        )}

                        {d && !loading && (
                            <>
                                {/* ── Encabezado ─────────────────────────── */}
                                <div className="d-flex align-items-center mb-4">
                                    <div className="avatar avatar-lg me-3 bg-label-primary rounded">
                                        <i className="ri-bank-line fs-3"></i>
                                    </div>
                                    <div>
                                        <h5 className="mb-0">{d.accountName}</h5>
                                        <small className="text-muted">{d.code} · {d.accountNumberMasked}</small>
                                    </div>
                                    <div className="ms-auto">
                                        <span className={`badge ${statusBadge[d.status] || 'bg-label-secondary'} fs-6`}>
                                            {statusLabels[d.status] || d.status}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Identificación ─────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-file-list-3-line me-1"></i>Identificación
                                </p>
                                <div className="row mb-3">
                                    <Row label="Código"          value={d.code} />
                                    <Row label="N° Cuenta"       value={d.accountNumberMasked} />
                                    <Row label="Nombre"          value={d.accountName} />
                                    <Row label="Tipo"            value={accountTypes.find(t => t.id === d.accountType)?.label || d.accountType} />
                                    {/* QA Bloque AU (2026-05-06) — Bug 2: leer rutas anidadas reales del
                                        BankAccountDTO. Antes el View leia d.bankName / d.currencyCode /
                                        d.chartOfAccountCode / d.companyName / d.branchName que el backend
                                        NO devuelve, asi todos esos campos aparecian vacios "—". */}
                                    <Row label="Banco"           value={d.bankDTO?.name} />
                                    <Row label="Moneda"          value={d.currencyTypeDTO?.isoCode} />
                                </div>

                                {/* ── Contabilidad ───────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-book-2-line me-1"></i>Contabilidad
                                </p>
                                <div className="row mb-3">
                                    <Row label="Cuenta contable" value={d.accountingAccountDTO?.customName} />
                                    <Row label="Centro de costo" value={d.costCenterDTO?.name} />
                                    <Row label="Saldo inicial"   value={d.initialBalance != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: d.currencyTypeDTO?.isoCode || 'COP', minimumFractionDigits: 0 }).format(d.initialBalance) : '—'} />
                                    <Row label="Saldo actual"    value={d.currentBalance != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: d.currencyTypeDTO?.isoCode || 'COP', minimumFractionDigits: 0 }).format(d.currentBalance) : '—'} />
                                </div>

                                {/* ── Sucursal ───────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-map-pin-line me-1"></i>Sucursal y contacto
                                </p>
                                <div className="row mb-3">
                                    <Row label="Sucursal"           value={d.bankBranchDTO?.address} />
                                    <Row label="Ejecutivo"          value={d.accountExecutive} />
                                    {/* QA Bloque AU+ (2026-05-07): si la sucursal
                                        tiene telefono, mostrarlo aqui (es el
                                        telefono de la sucursal especifica). Antes
                                        solo mostraba bankPhone (telefono general
                                        del banco) y QA reporto que el telefono
                                        de la sucursal no aparecia. */}
                                    <Row label="Teléfono sucursal"  value={d.bankBranchDTO?.phone || d.bankPhone} />
                                    <Row label="Fecha apertura"     value={d.openingDate} />
                                    <Row label="Última conciliación" value={d.lastReconciliationDate || '—'} />
                                </div>

                                {/* ── Descripción ────────────────────────── */}
                                {d.description && (
                                    <>
                                        <p className="text-muted fw-semibold mb-2 border-bottom pb-1">
                                            <i className="ri-chat-3-line me-1"></i>Descripción
                                        </p>
                                        <p className="mb-3">{d.description}</p>
                                    </>
                                )}

                                {/* ── Configuraciones ────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-toggle-line me-1"></i>Configuraciones
                                </p>
                                <div className="row mb-3">
                                    <BoolRow label="Permite sobregiro"     value={d.allowsOverdraft} />
                                    {d.allowsOverdraft && <Row label="Límite de crédito" value={d.creditLimit} />}
                                    <BoolRow label="Notifica saldo mínimo" value={d.notifyLowBalance} />
                                    {d.notifyLowBalance && <Row label="Saldo mínimo" value={d.minimumBalance} />}
                                    <BoolRow label="Maneja chequera"       value={d.handlesCheckbook} />
                                </div>

                                {/* ── Auditoría ──────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-time-line me-1"></i>Auditoría
                                </p>
                                <div className="row">
                                    <Row label="Creado el"  value={d.createdAt ? new Date(d.createdAt).toLocaleString('es-CO') : '—'} />
                                    <Row label="Eliminado"  value={d.deletedAt ? new Date(d.deletedAt).toLocaleString('es-CO') : '—'} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewBankAccount;
