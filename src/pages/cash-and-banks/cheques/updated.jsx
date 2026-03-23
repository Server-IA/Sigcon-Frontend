import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import AlertPage  from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

const ESTADO_BADGE = {
    DISPONIBLE: 'bg-label-secondary',
    EMITIDO:    'bg-label-primary',
    COBRADO:    'bg-label-success',
    ANULADO:    'bg-label-danger',
    EXTRAVIADO: 'bg-label-warning',
};

const TIPO_BADGE = {
    FISICO:  'bg-label-info',
    VIRTUAL: 'bg-label-dark',
};

const ESTADO_LABEL = {
    DISPONIBLE: 'Disponible',
    EMITIDO:    'Emitido',
    COBRADO:    'Cobrado',
    ANULADO:    'Anulado',
    EXTRAVIADO: 'Extraviado',
};

const TIPO_LABEL = {
    FISICO:  'Físico',
    VIRTUAL: 'Virtual',
};

const formatCurrency = (val) => {
    if (!val && val !== 0) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 2,
    }).format(val);
};

const DetailCheque = ({ modalRef, record }) => {

    const [detail,       setDetail]       = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onShow = async () => {
            if (!record?.id) return;
            setDetail(null);
            setErrorMessage('');

            try {
                setLoading(true);
                const url      = base_url(['api', 'v1', 'banks', 'checks', record.id]);
                const response = await fetchHelper.get(url, {}, 1000);
                setDetail(response?.data ?? null);
            } catch {
                setErrorMessage('No se pudo cargar el detalle del cheque.');
            } finally {
                setLoading(false);
            }
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef, record?.id]);

    const d = detail;

    return (
        <div className="modal fade" ref={modalRef} id="modalDetailCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Detalle del Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={!!errorMessage}
                            onChange={() => setErrorMessage('')}
                        />

                        {loading && (
                            <div className="text-center py-4">
                                <span className="spinner-border text-primary" role="status" />
                                <p className="mt-2 text-muted">Cargando detalle...</p>
                            </div>
                        )}

                        {!loading && d && (
                            <>
                                {/* Estado + Tipo */}
                                <div className="d-flex gap-2 mb-4">
                                    <span className={`badge ${ESTADO_BADGE[d.statusCheck] || 'bg-label-secondary'} fs-6`}>
                                        {ESTADO_LABEL[d.statusCheck] || d.statusCheck || '-'}
                                    </span>
                                    <span className={`badge ${TIPO_BADGE[d.typeCheck] || 'bg-label-secondary'} fs-6`}>
                                        {TIPO_LABEL[d.typeCheck] || d.typeCheck || '-'}
                                    </span>
                                    {d.blockPayment && (
                                        <span className="badge bg-label-danger fs-6">
                                            <i className="ri-lock-line me-1" />Pago bloqueado
                                        </span>
                                    )}
                                </div>

                                {/* ID + N° Cheque */}
                                <div className="row g-3 mb-2">
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_id"
                                            label="ID Cheque"
                                            value={d.id ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_numero"
                                            label="Número de cheque"
                                            value={d.numberCheck ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                </div>

                                {/* Chequera + Banco emisor */}
                                <div className="row g-3 mb-2">
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_chequera"
                                            label="N° Chequera"
                                            value={d.checkbook?.checkbookNumber ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_banco"
                                            label="Banco emisor"
                                            value={d.checkbook?.issuingBank ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                </div>

                                {/* Beneficiario */}
                                <div className="row g-3 mb-2">
                                    <div className="col-12">
                                        <InputModal
                                            type="text"
                                            id="detail_beneficiario"
                                            label="Beneficiario"
                                            value={d.beneficiary ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                </div>

                                {/* Valor + Fecha expedición */}
                                <div className="row g-3 mb-2">
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_valor"
                                            label="Valor"
                                            value={formatCurrency(d.value)}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            type="text"
                                            id="detail_fecha_expedicion"
                                            label="Fecha de expedición"
                                            value={d.issueDate ?? '-'}
                                            onChange={() => {}}
                                            disabled readOnly
                                        />
                                    </div>
                                </div>

                                {/* Fecha cobro + Referencia cobro */}
                                {(d.collectionDate || d.collectionReference) && (
                                    <div className="row g-3 mb-2">
                                        {d.collectionDate && (
                                            <div className="col-md-6">
                                                <InputModal
                                                    type="text"
                                                    id="detail_fecha_cobro"
                                                    label="Fecha de cobro"
                                                    value={d.collectionDate}
                                                    onChange={() => {}}
                                                    readOnly
                                                />
                                            </div>
                                        )}
                                        {d.collectionReference && (
                                            <div className="col-md-6">
                                                <InputModal
                                                    type="text"
                                                    id="detail_ref_cobro"
                                                    label="Referencia de cobro"
                                                    value={d.collectionReference}
                                                    onChange={() => {}}
                                                    readOnly
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(d.financialMovementId || d.conciliationMethod) && (
                                    <div className="row g-3 mb-2">
                                        {d.financialMovementId && (
                                            <div className="col-md-6">
                                                <InputModal
                                                    type="text"
                                                    id="detail_movimiento"
                                                    label="Movimiento financiero (ID)"
                                                    value={d.financialMovementId}
                                                    onChange={() => {}}
                                                    disabled readOnly
                                                />
                                            </div>
                                        )}
                                        {d.conciliationMethod && (
                                            <div className="col-md-6">
                                                <InputModal
                                                    type="text"
                                                    id="detail_conciliacion"
                                                    label="Método de conciliación"
                                                    value={d.conciliationMethod}
                                                    onChange={() => {}}
                                                    disabled readOnly
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Concepto */}
                                <div className="row g-3 mb-2">
                                    <div className="col-12">
                                        <label className="form-label">Concepto</label>
                                        <textarea
                                            className="form-control"
                                            value={d.concept || '-'}
                                            readOnly
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* Observaciones */}
                                {d.observations && (
                                    <div className="row g-3 mb-2">
                                        <div className="col-12">
                                            <label className="form-label">Observaciones</label>
                                            <textarea
                                                className="form-control"
                                                value={d.observations}
                                                readOnly
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Anulación */}
                                {d.voidReason && (
                                    <div className="row g-3 mb-2">
                                        <div className="col-md-6">
                                            <InputModal
                                                type="text"
                                                id="detail_void_date"
                                                label="Fecha de anulación"
                                                value={d.voidedAt ? d.voidedAt.split('T')[0] : '-'}
                                                onChange={() => {}}
                                                readOnly
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Motivo de anulación</label>
                                            <textarea
                                                className="form-control"
                                                value={d.voidReason}
                                                readOnly
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Incidente */}
                                {d.incidentType && (
                                    <div className="row g-3 mb-2">
                                        <div className="col-md-6">
                                            <InputModal
                                                type="text"
                                                id="detail_incident_type"
                                                label="Tipo de incidente"
                                                value={d.incidentType}
                                                onChange={() => {}}
                                                readOnly
                                            />
                                        </div>
                                        {d.incidentDate && (
                                            <div className="col-md-6">
                                                <InputModal
                                                    type="text"
                                                    id="detail_incident_date"
                                                    label="Fecha del incidente"
                                                    value={d.incidentDate}
                                                    onChange={() => {}}
                                                    readOnly
                                                />
                                            </div>
                                        )}
                                        {d.incidentDetail && (
                                            <div className="col-12">
                                                <label className="form-label">Detalle del incidente</label>
                                                <textarea
                                                    className="form-control"
                                                    value={d.incidentDetail}
                                                    readOnly
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                        {d.incidentActions && (
                                            <div className="col-12">
                                                <label className="form-label">Acciones tomadas</label>
                                                <textarea
                                                    className="form-control"
                                                    value={d.incidentActions}
                                                    readOnly
                                                    rows={2}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Documento soporte / PDF cheque virtual */}
                                {d.supportDocumentPath && (
                                    <div className="row g-3 mb-2">
                                        <div className="col-12">
                                            <label className="form-label">
                                                {d.typeCheck === 'VIRTUAL' ? 'Documento digital del cheque virtual' : 'Documento soporte'}
                                            </label>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <i className="ri-file-pdf-line text-danger fs-4" />
                                                <a
                                                    href={d.supportDocumentPath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-label-danger"
                                                >
                                                    <i className="ri-eye-line me-1" />Ver PDF
                                                </a>
                                                <a
                                                    href={d.supportDocumentPath}
                                                    download
                                                    className="btn btn-sm btn-label-primary"
                                                >
                                                    <i className="ri-download-line me-1" />Descargar
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailCheque;
