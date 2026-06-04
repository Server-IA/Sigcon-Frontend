import { useState, useEffect, useCallback } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputDate        from '../../../components/molecules/InputDate';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { validateText } from '../../../utils/fieldValidations';

const RECONCILE_URL = (id) => ['api', 'v1', 'banks', 'checks', id, 'reconcile'];

const ReconcileCheque = ({
    modalRef, modalInstance, record, dataTableRef, setMessage, metodos,
}) => {

    const today = new Date().toISOString().split('T')[0];

    const [form,             setForm]             = useState({ fechaCobro: today, metodoConciliacion: '', referenciaCobro: '', idMovimiento: '' });
    const [errorMessage,     setErrorMessage]     = useState('');
    const [loading,          setLoading]          = useState(false);
    const [movementOptions,  setMovementOptions]  = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    const loadUnmatchedMovements = useCallback(async (bankAccountId) => {
        if (!bankAccountId) {
            setMovementOptions([]);
            return;
        }
        try {
            setLoadingMovements(true);
            const url = base_url(
                ['api', 'v1', 'bank-accounts', bankAccountId, 'financial-movements'],
                { unmatchedOnly: true },
            );
            const res = await fetchHelper.get(url, {}, 1000, false, true);
            const list = Array.isArray(res?.data) ? res.data : [];
            setMovementOptions(list.map((m) => ({
                id:   String(m.id),
                name: `${m.movementDate} — ${formatCurrency(m.amount)} — ${(m.description || m.externalReference || 'Sin descripción').slice(0, 72)}`,
            })));
        } catch {
            setMovementOptions([]);
        } finally {
            setLoadingMovements(false);
        }
    }, []);

    useEffect(() => {
        setForm({ fechaCobro: today, metodoConciliacion: '', referenciaCobro: '', idMovimiento: '' });
        setErrorMessage('');
        setMovementOptions([]);
        if (record.idCuentaBancaria) {
            loadUnmatchedMovements(record.idCuentaBancaria);
        }
    }, [record, loadUnmatchedMovements]);

    useEffect(() => {
        if (form.metodoConciliacion === 'AUTOMATICA' && record.idCuentaBancaria) {
            loadUnmatchedMovements(record.idCuentaBancaria);
        }
        if (form.metodoConciliacion !== 'AUTOMATICA') {
            setForm((prev) => ({ ...prev, idMovimiento: '' }));
        }
    }, [form.metodoConciliacion, record.idCuentaBancaria, loadUnmatchedMovements]);

    const handleSubmit = async () => {
        if (!form.fechaCobro) {
            setErrorMessage('La fecha de cobro es obligatoria');
            return;
        }
        if (record.fechaExpedicion && new Date(form.fechaCobro) < new Date(record.fechaExpedicion)) {
            setErrorMessage('La fecha de cobro no puede ser anterior a la fecha de expedición');
            return;
        }
        if (new Date(form.fechaCobro) > new Date()) {
            setErrorMessage('La fecha de cobro no puede ser futura');
            return;
        }
        if (!form.metodoConciliacion) {
            setErrorMessage('Seleccione el método de conciliación');
            return;
        }
        // QA BNK (2026-06-03) BNK-RF-21: referencia min 3 / max 100 + clase reference.
        const refErr = validateText(form.referenciaCobro, {
            required: true, min: 3, max: 100, patternKey: 'reference', label: 'La referencia de cobro',
        });
        if (refErr) { setErrorMessage(refErr); return; }
        if (form.metodoConciliacion === 'AUTOMATICA') {
            if (!record.idCuentaBancaria) {
                setErrorMessage('La chequera no tiene cuenta bancaria asociada; no puede usar conciliación automática.');
                return;
            }
            if (!form.idMovimiento) {
                setErrorMessage('Seleccione el movimiento bancario del extracto (conciliación automática).');
                return;
            }
        }

        try {
            setLoading(true);
            const url = base_url(RECONCILE_URL(record.id));
            const body = {
                collectionDate:      form.fechaCobro,
                conciliationMethod:  form.metodoConciliacion,
                collectionReference: form.referenciaCobro.trim(),
            };
            if (form.metodoConciliacion === 'AUTOMATICA' && form.idMovimiento) {
                body.financialMovementId = Number(form.idMovimiento);
            }
            await fetchHelper.put(url, body, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();

            setMessage({
                message: `Cobro del cheque N° ${record.numeroCheque} registrado exitosamente`,
                type: 'success',
                show: true,
            });

            setForm({ fechaCobro: today, metodoConciliacion: '', referenciaCobro: '', idMovimiento: '' });
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(error?.msg || 'Error al registrar el cobro, intente nuevamente');
        } finally {
            setLoading(false);
        }
    };

    const showMovementSelect = form.metodoConciliacion === 'AUTOMATICA';

    return (
        <div className="modal fade" ref={modalRef} id="modalReconcileCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Cobro de Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} onChange={() => setErrorMessage('')} />

                        {/* Datos del cheque (solo lectura) */}
                        <div className="row">
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_numero"
                                    label="N° Cheque"
                                    value={record.numeroCheque}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_valor"
                                    label="Valor"
                                    value={formatCurrency(record.valorCheque)}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                            <div className="col-md-4 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_beneficiario"
                                    label="Beneficiario"
                                    value={record.beneficiario}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_fecha_expedicion"
                                    label="Fecha expedición"
                                    value={record.fechaExpedicion || '-'}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_concepto"
                                    label="Concepto"
                                    value={record.concepto}
                                    onChange={() => {}}
                                    disabled readOnly
                                />
                            </div>
                        </div>

                        {showMovementSelect && (
                            <p className="small text-muted mb-2">
                                Conciliación automática: el movimiento del extracto debe tener importe negativo igual a <strong>−valor del cheque</strong> (egreso bancario).
                                {loadingMovements ? ' Cargando movimientos…' : null}
                            </p>
                        )}

                        <hr />

                        {/* Datos de conciliación */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="rec_fecha_cobro"
                                    label="Fecha de cobro"
                                    date={form.fechaCobro}
                                    dateFormat="Y-m-d"
                                    onChange={(dateStr) => setForm(prev => ({ ...prev, fechaCobro: dateStr ?? '' }))}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="rec_metodo"
                                    label="Método de conciliación"
                                    value={form.metodoConciliacion}
                                    onChange={(val) => setForm(prev => ({ ...prev, metodoConciliacion: val }))}
                                    placeholder="Seleccionar método"
                                    options={metodos}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="rec_referencia"
                                    label="Referencia / N° transacción"
                                    placeholder="Ej: TRX-12345 (entre 3 y 100 caracteres)"
                                    value={form.referenciaCobro}
                                    onChange={(e) => setForm(prev => ({ ...prev, referenciaCobro: e.target.value }))}
                                    error=""
                                    maxLength={100}
                                    required
                                />
                            </div>
                            {/* QA Bloque AU (2026-05-06) — Bug 6: si la
                                conciliacion es MANUAL, ocultar el campo de
                                movimiento financiero en lugar de mostrarlo
                                deshabilitado con "—". El backend creara
                                automaticamente el FM al cobrar. */}
                            {showMovementSelect && (
                                <div className="col-md-6 mb-4 mt-2">
                                    <InputSelectModal
                                        id="rec_movimiento_select"
                                        label="Movimiento bancario (extracto)"
                                        value={form.idMovimiento}
                                        onChange={(val) => setForm(prev => ({ ...prev, idMovimiento: val || '' }))}
                                        placeholder={movementOptions.length ? 'Seleccionar movimiento' : 'Sin movimientos pendientes'}
                                        options={movementOptions}
                                        required
                                        disabled={loadingMovements || !movementOptions.length}
                                    />
                                </div>
                            )}
                            {!showMovementSelect && (
                                <div className="col-md-6 mb-4 mt-2 d-flex align-items-end">
                                    <div className="alert alert-info py-2 mb-0 w-100">
                                        <i className="ri-information-line me-1"></i>
                                        Conciliación manual: el sistema generará
                                        automáticamente el movimiento bancario
                                        al registrar el cobro.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-success ms-auto"
                            onClick={handleSubmit}
                            disabled={loading}>
                            {loading ? 'Registrando...' : 'Registrar Cobro'}
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

export default ReconcileCheque;
