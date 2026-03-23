import { useState, useEffect } from 'react';

import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import InputDate        from '../../../components/molecules/InputDate';
import AlertPage        from '../../../components/molecules/AlertPage';
import TextareaModal    from '../../../components/molecules/TextareaModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CHEQUERAS_URL = ['api', 'v1', 'checkbooks', 'search'];
const CREAR_URL     = ['api', 'v1', 'banks', 'checks', 'store'];

const emptyErrors = {
    idChequera: '', numeroCheque: '', beneficiario: '', valorCheque: '',
    concepto: '', fechaExpedicion: '',
};

const CreateCheque = ({
    modalRef, modalInstance, record, setRecord, dataTableRef, setMessage, tipos,
}) => {

    const [errors,           setErrors]           = useState({ ...emptyErrors });
    const [errorMessage,     setErrorMessage]     = useState('');
    const [loading,          setLoading]          = useState(false);
    const [loadingChequeras, setLoadingChequeras] = useState(false);
    const [chequeras,        setChequeras]        = useState([]);  // { id, name, checkStartNumber, checkEndNumber, availableChecks }

    // Limpiar al abrir modal
    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    // Cargar chequeras activas al abrir el modal
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onShow = async () => {
            setLoadingChequeras(true);
            try {
                const url = base_url(CHEQUERAS_URL);
                const res = await fetchHelper.post(url, {
                    draw: 1, start: 0, length: -1,
                    search: { value: '', regex: false }, columns: [], order: [],
                }, {}, 500, false);

                const items = (res?.data ?? []).filter(c => c.status === 'ACTIVA');
                setChequeras(items.map(c => ({
                    id:               c.id,
                    name:             `${c.checkbookNumber} — ${c.issuingBank ?? ''}`,
                    checkStartNumber: c.checkStartNumber,
                    checkEndNumber:   c.checkEndNumber,
                    availableChecks:  c.availableChecks,
                })));
            } catch {
                setChequeras([]);
            } finally {
                setLoadingChequeras(false);
            }
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef]);

    // Al seleccionar chequera: sugerir checkStartNumber como primer número disponible
    useEffect(() => {
        if (!record.idChequera) return;
        const chequera = chequeras.find(c => String(c.id) === String(record.idChequera));
        if (chequera?.checkStartNumber != null) {
            setRecord(prev => ({ ...prev, numeroCheque: String(chequera.checkStartNumber) }));
        }
    }, [record.idChequera, chequeras]);

    const chequeraActual = chequeras.find(c => String(c.id) === String(record.idChequera)) ?? null;

    const validate = () => {
        const errs = { ...emptyErrors };
        let valid = true;

        if (!record.idChequera) {
            errs.idChequera = 'Seleccione una chequera activa';
            valid = false;
        }

        const numCheque = Number(record.numeroCheque);
        if (!record.numeroCheque || String(record.numeroCheque).trim() === '') {
            errs.numeroCheque = 'El número de cheque es obligatorio';
            valid = false;
        } else if (chequeraActual) {
            if (numCheque < chequeraActual.checkStartNumber || numCheque > chequeraActual.checkEndNumber) {
                errs.numeroCheque = `BNK-ERR-090: Número fuera del rango de la chequera (${chequeraActual.checkStartNumber} – ${chequeraActual.checkEndNumber})`;
                valid = false;
            } else if (chequeraActual.availableChecks <= 0) {
                errs.numeroCheque = 'BNK-ERR-093: No hay cheques disponibles en la chequera seleccionada';
                valid = false;
            }
        }

        if (!record.beneficiario || record.beneficiario.trim() === '') {
            errs.beneficiario = 'El beneficiario es obligatorio';
            valid = false;
        }
        if (!record.valorCheque || Number(record.valorCheque) <= 0) {
            errs.valorCheque = 'El valor debe ser mayor a cero (BNK-ERR-094)';
            valid = false;
        }
        if (!record.concepto || record.concepto.trim() === '') {
            errs.concepto = 'El concepto es obligatorio';
            valid = false;
        }
        if (!record.fechaExpedicion) {
            errs.fechaExpedicion = 'La fecha de expedición es obligatoria';
            valid = false;
        } else if (new Date(record.fechaExpedicion) > new Date()) {
            errs.fechaExpedicion = 'La fecha de expedición no puede ser futura (BNK-ERR-095)';
            valid = false;
        }

        setErrors(errs);
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const url = base_url(CREAR_URL);
        const payload = {
            checkbookId:  Number(record.idChequera),
            numberCheck:  Number(record.numeroCheque),
            beneficiary:  record.beneficiario.trim(),
            value:        Number(record.valorCheque),
            concept:      record.concepto.trim(),
            issueDate:    record.fechaExpedicion,
            typeCheck:    record.tipoCheque || 'FISICO',
            observations: record.observaciones?.trim() || null,
        };

        try {
            setLoading(true);
            const response = await fetchHelper.post(url, payload, {}, 1000);
            dataTableRef?.current?.ajax.reload();

            const numeroCheque = record.numeroCheque;
            const tipoCheque   = record.tipoCheque || 'FISICO';
            const pdfPath      = response?.data?.supportDocumentPath ?? null;

            setRecord(prev => ({
                id: '', idChequera: '', numeroCheque: '', beneficiario: '',
                valorCheque: '', concepto: '', fechaExpedicion: '',
                tipoCheque: 'FISICO', estadoCheque: 'EMITIDO', fechaCobro: '',
                idMovimiento: '', observaciones: '', documentoSoporte: '',
            }));

            modalInstance?.current?.hide();
            setErrors({ ...emptyErrors });
            setErrorMessage('');

            if (tipoCheque === 'VIRTUAL' && pdfPath) {
                window.Swal.fire({
                    icon: 'success',
                    title: `Cheque Virtual emitido — N° ${numeroCheque}`,
                    html: `
                        <p class="mb-3">El cheque virtual fue emitido exitosamente y su documento digital ha sido generado.</p>
                        <a href="${pdfPath}" target="_blank" rel="noopener noreferrer"
                            class="btn btn-primary">
                            <i class="ri-file-pdf-line me-1"></i> Ver PDF del cheque
                        </a>`,
                    confirmButtonText: 'Cerrar',
                    showConfirmButton: true,
                });
            } else {
                setMessage({
                    message: `Cheque emitido exitosamente - Número: ${numeroCheque}`,
                    type: 'success',
                    show: true,
                });
            }
        } catch (error) {
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = { ...emptyErrors };
                errores.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            } else {
                setErrorMessage(error?.msg || 'BNK-ERR-098: Error al guardar la información, intente nuevamente');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setRecord(prev => ({
            ...prev,
            numeroCheque: '', beneficiario: '', valorCheque: '', concepto: '',
            fechaExpedicion: '', tipoCheque: 'FISICO', observaciones: '',
        }));
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Emitir Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

                        {/* Chequera */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputSelectModal
                                    id="cheque_chequera"
                                    label={loadingChequeras ? 'Cargando chequeras...' : 'Chequera activa'}
                                    value={record.idChequera}
                                    onChange={(val) => setRecord(prev => ({ ...prev, idChequera: val, numeroCheque: '' }))}
                                    error={errors.idChequera}
                                    placeholder="Seleccionar chequera"
                                    options={chequeras}
                                    required
                                />
                            </div>
                        </div>

                        {/* N° Cheque + Tipo */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="cheque_numero"
                                    label="Número de cheque"
                                    placeholder="Número del cheque"
                                    value={record.numeroCheque}
                                    onChange={(e) => setRecord(prev => ({ ...prev, numeroCheque: e.target.value }))}
                                    error={errors.numeroCheque}
                                    required
                                />
                                {chequeraActual && !errors.numeroCheque && (
                                    <small className="text-muted d-block mt-1">
                                        Rango: <strong>{chequeraActual.checkStartNumber} – {chequeraActual.checkEndNumber}</strong>
                                        &nbsp;·&nbsp;Disponibles: <strong>{chequeraActual.availableChecks}</strong>
                                    </small>
                                )}
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="cheque_tipo"
                                    label="Tipo de cheque"
                                    value={record.tipoCheque}
                                    onChange={(val) => setRecord(prev => ({ ...prev, tipoCheque: val }))}
                                    placeholder="Seleccionar tipo"
                                    options={tipos}
                                    required
                                />
                            </div>
                        </div>

                        {/* Beneficiario */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="cheque_beneficiario"
                                    label="Beneficiario"
                                    placeholder="Nombre o razón social del beneficiario"
                                    value={record.beneficiario}
                                    onChange={(e) => setRecord(prev => ({ ...prev, beneficiario: e.target.value }))}
                                    error={errors.beneficiario}
                                    required
                                />
                            </div>
                        </div>

                        {/* Valor + Fecha expedición */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="cheque_valor"
                                    label="Valor del cheque"
                                    placeholder="0.00"
                                    value={record.valorCheque}
                                    onChange={(e) => setRecord(prev => ({ ...prev, valorCheque: e.target.value }))}
                                    error={errors.valorCheque}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="cheque_fecha_expedicion"
                                    label="Fecha de expedición"
                                    date={record.fechaExpedicion}
                                    dateFormat="Y-m-d"
                                    onChange={(dateStr) => setRecord(prev => ({ ...prev, fechaExpedicion: dateStr ?? '' }))}
                                    error={errors.fechaExpedicion}
                                    required
                                />
                            </div>
                        </div>

                        {/* Concepto */}
                        <div className="row">
                            <TextareaModal
                                id="cheque_concepto"
                                label="Concepto"
                                placeholder="Descripción del pago"
                                value={record.concepto}
                                onChange={(e) => setRecord(prev => ({ ...prev, concepto: e.target.value }))}
                                error={errors.concepto}
                                required
                            />
                        </div>

                        {/* Observaciones */}
                        <div className="row">
                            <TextareaModal
                                id="cheque_observaciones"
                                label="Observaciones"
                                placeholder="Observaciones adicionales (opcional)"
                                value={record.observaciones}
                                onChange={(e) => setRecord(prev => ({ ...prev, observaciones: e.target.value }))}
                                error=""
                            />
                        </div>

                        {/* Aviso cheque virtual */}
                        {record.tipoCheque === 'VIRTUAL' && (
                            <div className="row">
                                <div className="col-12 mb-2">
                                    <div className="alert alert-info d-flex align-items-center gap-2 mb-0 py-2">
                                        <i className="ri-file-pdf-line fs-5" />
                                        <span>El sistema generará automáticamente el documento PDF del cheque virtual al confirmar la emisión.</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-primary ms-auto"
                            onClick={handleSubmit}
                            disabled={loading}>
                            {loading ? 'Emitiendo...' : 'Emitir Cheque'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleClear}
                            disabled={loading}>
                            Limpiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal">
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCheque;
