import { useEffect, useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { validateText, validateNumber } from '../../../utils/fieldValidations';

/**
 * Modal para crear una nueva Proyeccion de Flujo de Caja.
 * POST a /api/v1/bnk/projections
 */

const PERIODICITY_OPTIONS = [
    { id: 'DIARIA',     label: 'Diaria' },
    { id: 'SEMANAL',    label: 'Semanal' },
    { id: 'QUINCENAL',  label: 'Quincenal' },
    { id: 'MENSUAL',    label: 'Mensual' },
    { id: 'BIMESTRAL',  label: 'Bimestral' },
    { id: 'TRIMESTRAL', label: 'Trimestral' },
    { id: 'SEMESTRAL',  label: 'Semestral' },
    { id: 'ANUAL',      label: 'Anual' },
];

const TYPE_OPTIONS = [
    { id: 'INGRESOS', label: 'Ingresos' },
    { id: 'EGRESOS',  label: 'Egresos' },
    { id: 'NETA',     label: 'Neta' },
];

const CreateProjection = ({ modalRef, modalInstance, projection, setProjection, dataTableRef, setItemCreate }) => {
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [currencies, setCurrencies]     = useState([]);

    // Cargar monedas para el dropdown
    useEffect(() => {
        fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 0, true)
            .then(resp => {
                const list = resp?.data?.data ?? resp?.data ?? resp ?? [];
                const arr = Array.isArray(list) ? list : (list?.data || []);
                if (Array.isArray(arr)) {
                    setCurrencies(arr.map(c => ({
                        id: c.isoCode || c.code || c.id,
                        label: `${c.isoCode || c.code || ''} - ${c.name || ''}`.trim(),
                    })));
                }
            })
            .catch(() => {});
    }, []);

    const set = (field, value) => setProjection(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        // QA BNK (2026-06-03) BNK-RF-39: nombre min 3 / max 255, descripcion 0/500,
        // saldo y flujo hasta 2 decimales (max 999.999.999,99), fin > inicio.
        const next = {};
        next.name = validateText(projection.name, { required: true, min: 3, max: 255, patternKey: 'name', label: 'El nombre' });
        next.description = validateText(projection.description, { required: false, min: 0, max: 500, patternKey: 'description', label: 'La descripción' });
        if (!projection.startDate) next.startDate = 'La fecha de inicio es obligatoria';
        if (!projection.endDate) next.endDate = 'La fecha de fin es obligatoria';
        if (projection.startDate && projection.endDate && new Date(projection.endDate) <= new Date(projection.startDate)) {
            next.endDate = 'La fecha fin debe ser posterior a la fecha de inicio';
        }
        if (!projection.periodicity) next.periodicity = 'Seleccione la periodicidad';
        if (!projection.projectionType) next.projectionType = 'Seleccione el tipo';
        next.initialBalance = validateNumber(projection.initialBalance, { required: true, min: 0, max: 999999999.99, decimals: 2, label: 'El saldo inicial' });
        next.netFlow = validateNumber(projection.netFlow, { required: true, min: 0, max: 999999999.99, decimals: 2, label: 'El flujo por período' });
        Object.keys(next).forEach(k => { if (next[k] == null) delete next[k]; });
        if (Object.keys(next).length > 0) { setErrors(next); return; }

        const payload = {
            name:           projection.name,
            description:    projection.description || null,
            startDate:      projection.startDate,
            endDate:        projection.endDate,
            periodicity:    projection.periodicity,
            projectionType: projection.projectionType,
            initialBalance: projection.initialBalance !== '' ? Number(projection.initialBalance) : null,
            netFlow:        projection.netFlow !== '' ? Number(projection.netFlow) : null,
            currency:       projection.currency || 'COP',
        };

        try {
            await fetchHelper.post(base_url(['api', 'v1', 'bnk', 'projections']), payload, {}, 1000, true);
            modalInstance?.current?.hide();
            setItemCreate(true);
            dataTableRef?.current?.ajax?.reload?.();
        } catch (err) {
            if (err?.errors) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al registrar la proyeccion.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-line-chart-line me-2" />Crear Proyeccion de Flujo de Caja
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_name" label="Nombre" value={projection.name}
                                    onChange={e => set('name', e.target.value)}
                                    error={errors.name} required={true} maxLength={255}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="proj_currency" label="Moneda" value={projection.currency}
                                    onChange={(val) => set('currency', val)}
                                    error={errors.currency}
                                    options={currencies}
                                    placeholder="Seleccione moneda"
                                />
                            </div>
                            <div className="col-md-12 mb-3">
                                <InputModal
                                    id="proj_desc" label="Descripcion" value={projection.description}
                                    onChange={e => set('description', e.target.value)}
                                    error={errors.description} maxLength={500}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_start" label="Fecha Inicio" type="date"
                                    value={projection.startDate}
                                    onChange={e => set('startDate', e.target.value)}
                                    error={errors.startDate} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_end" label="Fecha Fin" type="date"
                                    value={projection.endDate}
                                    onChange={e => set('endDate', e.target.value)}
                                    error={errors.endDate} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="proj_periodicity" label="Periodicidad"
                                    value={projection.periodicity}
                                    onChange={v => set('periodicity', v)}
                                    error={errors.periodicity}
                                    options={PERIODICITY_OPTIONS}
                                    placeholder="Seleccione periodicidad"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="proj_type" label="Tipo de Proyeccion"
                                    value={projection.projectionType}
                                    onChange={v => set('projectionType', v)}
                                    error={errors.projectionType}
                                    options={TYPE_OPTIONS}
                                    placeholder="Seleccione tipo"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_initial" label="Saldo Inicial" type="number"
                                    value={projection.initialBalance}
                                    onChange={e => set('initialBalance', e.target.value)}
                                    error={errors.initialBalance} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_netflow" label="Flujo por periodo (magnitud)" type="number"
                                    value={projection.netFlow}
                                    onChange={e => set('netFlow', e.target.value)}
                                    error={errors.netFlow} required={true}
                                />
                                <small className="text-muted d-block mt-1">
                                    Ingrese siempre un valor positivo. El sistema aplicara el signo
                                    segun el tipo (INGRESOS suma, EGRESOS resta) y multiplicara por la
                                    cantidad de periodos del rango antes de calcular el saldo final.
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                            <i className="ri-save-line me-1" />Registrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateProjection;
