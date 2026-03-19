import InputModal    from '../../../components/molecules/InputModal';
import AlertPage     from '../../../components/molecules/AlertPage';

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

const DetailCheque = ({ modalRef, record, estados, tipos }) => {

    const estadoLabel = estados.find(e => e.id === record.estadoCheque)?.name || record.estadoCheque || '-';
    const tipoLabel   = tipos.find(t => t.id === record.tipoCheque)?.name    || record.tipoCheque    || '-';

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalDetailCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Detalle del Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* Estado + Tipo */}
                        <div className="d-flex gap-2 mb-4">
                            <span className={`badge ${ESTADO_BADGE[record.estadoCheque] || 'bg-label-secondary'} fs-6`}>
                                {estadoLabel}
                            </span>
                            <span className={`badge ${TIPO_BADGE[record.tipoCheque] || 'bg-label-secondary'} fs-6`}>
                                {tipoLabel}
                            </span>
                        </div>

                        {/* ID + N° Cheque */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_id"
                                    label="ID Cheque"
                                    value={record.id}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_numero"
                                    label="Número de cheque"
                                    value={record.numeroCheque}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* ID Chequera + ID Movimiento */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_chequera"
                                    label="Chequera (ID)"
                                    value={record.idChequera}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_movimiento"
                                    label="Movimiento asociado (ID)"
                                    value={record.idMovimiento || '-'}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Beneficiario */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_beneficiario"
                                    label="Beneficiario"
                                    value={record.beneficiario}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Valor + Fecha expedición */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_valor"
                                    label="Valor"
                                    value={formatCurrency(record.valorCheque)}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="detail_fecha_expedicion"
                                    label="Fecha de expedición"
                                    value={record.fechaExpedicion || '-'}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Fecha cobro (si aplica) */}
                        {record.fechaCobro && (
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <InputModal
                                        type="text"
                                        id="detail_fecha_cobro"
                                        label="Fecha de cobro"
                                        value={record.fechaCobro}
                                        onChange={() => {}}
                                        disabled
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}

                        {/* Concepto */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <label className="form-label">Concepto</label>
                                <textarea
                                    className="form-control"
                                    value={record.concepto || '-'}
                                    readOnly
                                    disabled
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Observaciones */}
                        {record.observaciones && (
                            <div className="row">
                                <div className="col-12 mb-4 mt-2">
                                    <label className="form-label">Observaciones</label>
                                    <textarea
                                        className="form-control"
                                        value={record.observaciones}
                                        readOnly
                                        disabled
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Documento soporte */}
                        {record.documentoSoporte && (
                            <div className="row">
                                <div className="col-12 mb-4 mt-2">
                                    <label className="form-label">Documento soporte</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="ri-file-pdf-line text-danger fs-4"></i>
                                        <a
                                            href={record.documentoSoporte}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary">
                                            Ver documento
                                        </a>
                                    </div>
                                </div>
                            </div>
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
