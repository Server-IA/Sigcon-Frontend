import { useState, useEffect } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// TODO: confirmar ruta del endpoint con backend
const COBRAR_URL = (id) => ['api', 'v1', 'cash-and-banks', 'cheques', id, 'cobrar'];

const ReconcileCheque = ({
    modalRef, modalInstance, record, setRecord, dataTableRef, setMessage, metodos,
}) => {

    const today = new Date().toISOString().split('T')[0];

    const [form,         setForm]         = useState({ fechaCobro: today, metodoConciliacion: '', referenciaCobro: '', idMovimiento: '' });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading,      setLoading]      = useState(false);

    useEffect(() => {
        setForm({ fechaCobro: today, metodoConciliacion: '', referenciaCobro: '', idMovimiento: '' });
        setErrorMessage('');
    }, [record]);

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

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
        if (!form.referenciaCobro || form.referenciaCobro.trim() === '') {
            setErrorMessage('La referencia de cobro es obligatoria');
            return;
        }

        try {
            setLoading(true);
            const url = base_url(COBRAR_URL(record.id));
            await fetchHelper.put(url, {
                fechaCobro:         form.fechaCobro,
                metodoConciliacion: form.metodoConciliacion,
                referenciaCobro:    form.referenciaCobro.trim(),
                ...(form.idMovimiento && { idMovimiento: Number(form.idMovimiento) }),
            }, {}, 1000);

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
            console.error(error);
            setErrorMessage(error?.msg || 'Error al registrar el cobro, intente nuevamente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalReconcileCheque" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Cobro de Cheque</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

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

                        <hr />

                        {/* Datos de conciliación */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="rec_fecha_cobro"
                                    label="Fecha de cobro"
                                    value={form.fechaCobro}
                                    onChange={(e) => setForm(prev => ({ ...prev, fechaCobro: e.target.value }))}
                                    error=""
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
                                    placeholder="Número de referencia del cobro"
                                    value={form.referenciaCobro}
                                    onChange={(e) => setForm(prev => ({ ...prev, referenciaCobro: e.target.value }))}
                                    error=""
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="rec_movimiento"
                                    label="ID Movimiento bancario (opcional)"
                                    placeholder="Si existe movimiento asociado"
                                    value={form.idMovimiento}
                                    onChange={(e) => setForm(prev => ({ ...prev, idMovimiento: e.target.value }))}
                                    error=""
                                />
                            </div>
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
