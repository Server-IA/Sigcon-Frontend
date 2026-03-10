import { useState, useEffect, useMemo } from 'react';

import AlertPage        from '../../../components/molecules/AlertPage';
import InputModal       from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

const CreateSegmentation = ({
    modalRef,
    modalInstance,
    dataTableRef,
    setMessage,
    segments,
}) => {

    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors]             = useState({});
    const [loading, setLoading]           = useState(false);

    const initialRecord = {
        clientName:          '',
        lastCalculationDate: '',
        autoSegment:         '',
        daysPastDue:         '',
    };

    const [record, setRecord] = useState(initialRecord);

    // Limpiar al abrir
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;
        const onShow = () => {
            setRecord(initialRecord);
            setErrors({});
            setErrorMessage('');
        };
        el.addEventListener('show.bs.modal', onShow);
        return () => el.removeEventListener('show.bs.modal', onShow);
    }, [modalRef]);

    const handleClear = () => {
        setRecord(initialRecord);
        setErrors({});
        setErrorMessage('');
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        setErrors({});

        if (!record.clientName?.trim()) {
            setErrors(prev => ({ ...prev, clientName: 'El cliente es requerido' }));
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

            const url     = base_url(['api', 'v1', 'third-parties', 'store']);
            const payload = {
                clientName:          record.clientName.trim(),
                lastCalculationDate: record.lastCalculationDate,
                autoSegment:         record.autoSegment,
                daysPastDue:         Number(record.daysPastDue),
            };

            await fetchHelper.post(url, payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({ message: 'Segmentación creada exitosamente', type: 'success', show: true });

        } catch (error) {
            const fieldErrors = {};
            error?.errors?.forEach(err => { fieldErrors[err.field] = err.message; });
            setErrors(fieldErrors);
            setErrorMessage(error?.msg || 'Error al crear la segmentación');
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
                    </div>

                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row g-3">

                            {/* Cliente */}
                            <div className="col-md-6">
                                <InputModal
                                    type="text"
                                    id="seg_create_clientName"
                                    label="Cliente"
                                    value={record.clientName}
                                    onChange={(e) => setRecord(prev => ({ ...prev, clientName: e.target.value }))}
                                    placeholder="Ingrese nombre"
                                    error={errors.clientName}
                                    required
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

                    <div className="modal-footer d-flex justify-content-between">
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-primary waves-effect waves-light"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-1" role="status" /> Guardando...</>
                                    : 'Guardar'
                                }
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary waves-effect"
                                onClick={handleClear}
                                disabled={loading}
                            >
                                Limpiar
                            </button>
                        </div>
                        <button
                            type="button"
                            className="btn btn-danger waves-effect"
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
