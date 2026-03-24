import { useState, useEffect, useMemo } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

const CreateSegmentation = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    segments,
}) => {

    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading]           = useState(false);

    const [clientOptions, setClientOptions]   = useState([]);
    const [loadingClients, setLoadingClients] = useState(false);

    // Cargar clientes al abrir el modal
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;

        const onShow = async () => {
            setErrors({});
            setErrorMessage('');
            try {
                setLoadingClients(true);
                const url = base_url(['api', 'v1', 'third-parties', 'search']);
                const payload = { length: -1 };
                const response = await fetchHelper.post(url, payload, {}, 1000);
                const items = response?.data || [];
                setClientOptions(items.map(item => ({
                    id:   item.id,
                    name: `${item.nit ?? ''} — ${item.businessName ?? ''}`.trim(),
                })));
            } catch {
                setClientOptions([]);
            } finally {
                setLoadingClients(false);
            }
        };

        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef]);

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [record]);

    const handleClear = () => {
        setRecord(prev => ({
            ...prev,
            clientId:            '',
            clientName:          '',
            lastCalculationDate: '',
            autoSegment:         '',
            daysPastDue:         '',
        }));
        setErrors({});
        setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');

        if (!record.clientId) {
            setErrors(prev => ({ ...prev, clientId: 'El cliente es requerido' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }
        if (!record.lastCalculationDate) {
            setErrors(prev => ({ ...prev, lastCalculationDate: 'La fecha del último cálculo es requerida' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }
        if (!record.autoSegment) {
            setErrors(prev => ({ ...prev, autoSegment: 'El segmento automático es requerido' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }
        if (record.daysPastDue === '' || record.daysPastDue === null) {
            setErrors(prev => ({ ...prev, daysPastDue: 'Los días mora son requeridos' }));
            setErrorMessage('Por favor complete todos los campos requeridos');
            return;
        }

        try {
            setLoading(true);

            const url     = base_url(['api', 'v1', 'ecl-segmentation', 'calculate']);
            const payload = {
                clientId:            Number(record.clientId),
                lastCalculationDate: record.lastCalculationDate,
                autoSegment:         record.autoSegment,
                daysPastDue:         Number(record.daysPastDue),
            };

            await fetchHelper.post(url, payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({ message: 'Segmentación calculada exitosamente', type: 'success', show: true });
            setErrors({});
            setErrorMessage('');

        } catch (error) {
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const segmentOptions = useMemo(() => segments.filter(s => s.id !== 'PENDING'), [segments]);

    return (
        <div
            className="modal fade"
            ref={modalRef}
            id="modalCreateSegmentation"
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">

                    <div className="modal-header">
                        <h4 className="modal-title">Segmentación de Riesgo ECL</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={!!errorMessage}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row g-3">

                            {/* Cliente */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="seg_create_client"
                                    label={loadingClients ? 'Cargando clientes...' : 'Cliente'}
                                    value={record.clientId}
                                    onChange={(val) => setRecord(prev => ({ ...prev, clientId: val }))}
                                    options={clientOptions}
                                    error={errors.clientId}
                                    required
                                    disabled={loadingClients}
                                />
                            </div>

                            {/* Fecha último cálculo */}
                            <div className="col-md-6">
                                <InputModal
                                    type="date"
                                    id="seg_create_lastCalcDate"
                                    label="Fecha del ultimo cálculo"
                                    value={record.lastCalculationDate}
                                    onChange={(e) => setRecord(prev => ({ ...prev, lastCalculationDate: e.target.value }))}
                                    error={errors.lastCalculationDate}
                                    required
                                />
                            </div>

                            {/* Segmento automático */}
                            <div className="col-md-6">
                                <InputSelectModal
                                    id="seg_create_autoSegment"
                                    label="Segmento automatico"
                                    value={record.autoSegment}
                                    onChange={(val) => setRecord(prev => ({ ...prev, autoSegment: val }))}
                                    options={segmentOptions}
                                    error={errors.autoSegment}
                                    required
                                />
                            </div>

                            {/* Días mora */}
                            <div className="col-md-6">
                                <InputModal
                                    type="number"
                                    id="seg_create_daysPastDue"
                                    label="Días mora"
                                    value={record.daysPastDue}
                                    onChange={(e) => setRecord(prev => ({ ...prev, daysPastDue: e.target.value }))}
                                    placeholder="EJ: 24"
                                    error={errors.daysPastDue}
                                    required
                                />
                            </div>

                        </div>

                    </div>

                    <div className="modal-footer justify-content-start">
                        <button
                            type="button"
                            className="btn btn-primary waves-effect waves-light"
                            onClick={handleSubmit}
                            disabled={loading || loadingClients}
                        >
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Guardando...</>
                                : 'Guardar'
                            }
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary waves-effect"
                            onClick={handleClear}
                            disabled={loading}
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger waves-effect ms-auto"
                            data-bs-dismiss="modal"
                            disabled={loading}
                        >
                            Volver
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreateSegmentation;
