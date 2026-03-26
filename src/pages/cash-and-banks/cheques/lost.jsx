import { useState, useEffect } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputDate        from '../../../components/molecules/InputDate';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal    from '../../../components/molecules/TextareaModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const EXTRAVIADO_URL = (id) => ['api', 'v1', 'banks', 'checks', id, 'report-lost'];

const LostCheque = ({
    modalRef, modalInstance, record, setRecord, dataTableRef, setMessage, tiposIncidente,
}) => {

    const today = new Date().toISOString().split('T')[0];

    const [form,         setForm]         = useState({ fechaExtravio: today, tipoIncidente: '', detalleIncidente: '', accionesTomadas: '', documentoBase64: '', documentoNombre: '' });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading,      setLoading]      = useState(false);

    useEffect(() => {
        setForm({ fechaExtravio: today, tipoIncidente: '', detalleIncidente: '', accionesTomadas: '', documentoBase64: '', documentoNombre: '' });
        setErrorMessage('');
    }, [record]);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setForm(prev => ({
                ...prev,
                documentoBase64: reader.result.split(',')[1],
                documentoNombre: file.name,
            }));
        };
        reader.readAsDataURL(file);
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    const handleSubmit = async () => {
        if (!form.fechaExtravio) {
            setErrorMessage('La fecha del extravío es obligatoria');
            return;
        }
        if (new Date(form.fechaExtravio) > new Date()) {
            setErrorMessage('La fecha de extravío no puede ser futura');
            return;
        }
        if (!form.tipoIncidente) {
            setErrorMessage('Seleccione el tipo de incidente');
            return;
        }
        if (!form.detalleIncidente || form.detalleIncidente.trim() === '') {
            setErrorMessage('Debe proporcionar un detalle del incidente');
            return;
        }
        if (!form.accionesTomadas || form.accionesTomadas.trim() === '') {
            setErrorMessage('Debe proporcionar las acciones tomadas');
            return;
        }

        try {
            setLoading(true);
            const url = base_url(EXTRAVIADO_URL(record.id));
            await fetchHelper.put(url, {
                incidentDate:             form.fechaExtravio,
                incidentType:             form.tipoIncidente,
                incidentDetail:           form.detalleIncidente.trim(),
                incidentActions:          form.accionesTomadas.trim(),
                ...(form.documentoBase64 && {
                    supportDocumentBase64:   form.documentoBase64,
                    supportDocumentFileName: form.documentoNombre,
                }),
            }, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();

            setMessage({
                message: `Cheque N° ${record.numeroCheque} reportado como ${form.tipoIncidente.toLowerCase()} exitosamente`,
                type: 'success',
                show: true,
            });

            setForm({ fechaExtravio: today, tipoIncidente: '', detalleIncidente: '', accionesTomadas: '' });
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(error?.msg || 'Error al reportar el incidente, intente nuevamente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalLostCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Reportar Cheque Extraviado / Robado</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} onChange={() => setErrorMessage('')} />

                        <div className="alert alert-warning mb-4" role="alert">
                            <i className="ri-shield-flash-line me-2"></i>
                            Al confirmar, el cheque quedará marcado como <strong>NO COBRABLE</strong> y se bloqueará su conciliación automática y manual (BNK-ERR-EXV-001).
                        </div>

                        {/* Datos del cheque (solo lectura) */}
                        <div className="row">
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="lost_numero"
                                    label="N° Cheque"
                                    value={record.numeroCheque}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="lost_valor"
                                    label="Valor"
                                    value={formatCurrency(record.valorCheque)}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="lost_beneficiario"
                                    label="Beneficiario"
                                    value={record.beneficiario}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                        </div>

                        {/* Fecha extravío + Tipo incidente */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="lost_fecha"
                                    label="Fecha del extravío / incidente"
                                    date={form.fechaExtravio}
                                    dateFormat="Y-m-d"
                                    onChange={(dateStr) => setForm(prev => ({ ...prev, fechaExtravio: dateStr ?? '' }))}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="lost_tipo"
                                    label="Tipo de incidente"
                                    value={form.tipoIncidente}
                                    onChange={(val) => setForm(prev => ({ ...prev, tipoIncidente: val }))}
                                    placeholder="Seleccionar tipo"
                                    options={tiposIncidente}
                                    required
                                />
                            </div>
                        </div>

                        {/* Detalle del incidente */}
                        <div className="row">
                            <TextareaModal
                                id="lost_detalle"
                                label="Detalle del incidente"
                                placeholder="Describa en detalle lo ocurrido con el cheque"
                                value={form.detalleIncidente}
                                onChange={(e) => setForm(prev => ({ ...prev, detalleIncidente: e.target.value }))}
                                error=""
                                required
                            />
                        </div>

                        {/* Acciones tomadas */}
                        <div className="row">
                            <TextareaModal
                                id="lost_acciones"
                                label="Acciones tomadas"
                                placeholder="Ej. Notificación al banco, denuncia ante autoridades, etc."
                                value={form.accionesTomadas}
                                onChange={(e) => setForm(prev => ({ ...prev, accionesTomadas: e.target.value }))}
                                error=""
                                required
                            />
                        </div>

                        {/* Documento soporte (opcional) */}
                        <div className="row mt-2">
                            <div className="col-12 mb-3">
                                <label className="form-label">Documento soporte <span className="text-muted">(opcional)</span></label>
                                <input
                                    type="file"
                                    className="form-control"
                                    id="lost_documento"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFile}
                                />
                                {form.documentoBase64 && (
                                    <small className="text-success mt-1 d-block">
                                        <i className="ri-check-line me-1" />
                                        Archivo cargado: {form.documentoNombre}
                                    </small>
                                )}
                            </div>
                        </div>

                        {/* Sugerencia al usuario */}
                        <div className="alert alert-info mt-2" role="alert">
                            <i className="ri-information-line me-2"></i>
                            <strong>Recomendación:</strong> Notifique inmediatamente a su entidad bancaria para bloquear el cheque y evitar su cobro no autorizado.
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-warning ms-auto"
                            onClick={handleSubmit}
                            disabled={loading}>
                            {loading ? 'Reportando...' : 'Confirmar Reporte'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LostCheque;
