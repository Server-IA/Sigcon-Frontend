import { useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { sanitizeInteger } from '../../../utils/inputSanitize';

/** Modal para registrar una nueva Resolucion DIAN. */

const emptyRecord = {
    resolutionNumber: '',
    prefix: 'FV',
    startNumber: '',
    endNumber: '',
    startDate: '',
    endDate: '',
    technicalKey: '',
    status: 'ACTIVE',
    notes: '',
};

const STATUS_OPTIONS = [
    { id: 'ACTIVE', name: 'Vigente' },
    { id: 'EXPIRED', name: 'Vencida' },
    { id: 'EXHAUSTED', name: 'Agotada' },
];

const CreateDianResolution = ({ modalRef, modalInstance, dataTableRef, setMessage, reloadAlerts }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({});
    // QA CXC Bug 5 (2026-06-03 / IEEE AR-RF-17): el error general debe mostrarse
    // DENTRO del modal (antes se enviaba al banner de la pagina via setMessage,
    // quedando fuera del modal abierto).
    const [errorMessage, setErrorMessage] = useState('');

    // QA Bloque BJ (2026-05-17): los handlers de InputModal y InputSelectModal
    // entregan distintos shapes:
    //   - InputModal -> evento DOM nativo (e.target.name, e.target.value)
    //   - InputSelectModal -> el value directo (string), sin envoltorio evento
    // Por eso usamos una factory `setField(name)` que retorna el handler
    // adecuado para cada campo. Antes el form se rompia porque ningun input
    // tenia `name` y el setRecord({...r, [undefined]: value}) no persistia.
    const setField = (name) => (eOrValue) => {
        const value = (eOrValue && eOrValue.target !== undefined)
            ? eOrValue.target.value
            : eOrValue;
        setRecord((r) => ({ ...r, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'ar', 'dian', 'resolutions', 'store']),
                {
                    ...record,
                    startNumber: Number(record.startNumber),
                    endNumber: Number(record.endNumber),
                },
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Resolucion DIAN creada correctamente.' });
            setRecord({ ...emptyRecord });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            reloadAlerts && reloadAlerts();
        } catch (err) {
            if (Array.isArray(err?.errors)) {
                const e = {};
                err.errors.forEach((x) => { e[x.field] = x.message; });
                setErrors(e);
            }
            // QA CXC Bug 5: el error general se muestra DENTRO del modal, no en
            // el banner de la pagina.
            setErrorMessage(err?.msg || err?.message || 'Error al crear la resolucion.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <form className="modal-content" onSubmit={onSubmit}>
                    <div className="modal-header">
                        <h5 className="modal-title">Nueva Resolucion DIAN</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {/* QA CXC Bug 5 (2026-06-03 / IEEE AR-RF-17): error general DENTRO del modal. */}
                        <AlertPage type="danger" message={errorMessage} show={!!errorMessage}
                            onChange={() => setErrorMessage('')} />
                        <div className="row g-3">
                            <InputModal col="col-md-6" id="dian_res_num" label="# Resolucion" name="resolutionNumber" type="text"
                                value={record.resolutionNumber} onChange={setField('resolutionNumber')} error={errors.resolutionNumber} required />
                            <InputModal col="col-md-3" id="dian_prefix" label="Prefijo" name="prefix" type="text"
                                value={record.prefix} onChange={setField('prefix')} error={errors.prefix} required />
                            <div className="col-md-3">
                                <InputSelectModal id="dian_status" label="Estado"
                                    value={record.status} onChange={setField('status')} options={STATUS_OPTIONS} />
                            </div>
                            {/* QA CXC Bug 5 (2026-06-03 / IEEE AR-RF-17): numero inicial/final
                                solo admiten digitos (text + inputMode numeric + sanitizeInteger).
                                Antes con type="number" Firefox mostraba letras tecleadas. */}
                            <InputModal col="col-md-6" id="dian_start_num" label="Numero inicial" name="startNumber" type="text"
                                inputMode="numeric"
                                value={record.startNumber}
                                onChange={(e) => setRecord((r) => ({ ...r, startNumber: sanitizeInteger(e.target.value) }))}
                                error={errors.startNumber} required />
                            <InputModal col="col-md-6" id="dian_end_num" label="Numero final" name="endNumber" type="text"
                                inputMode="numeric"
                                value={record.endNumber}
                                onChange={(e) => setRecord((r) => ({ ...r, endNumber: sanitizeInteger(e.target.value) }))}
                                error={errors.endNumber} required />
                            <InputModal col="col-md-6" id="dian_start_date" label="Fecha inicio" name="startDate" type="date"
                                value={record.startDate} onChange={setField('startDate')} error={errors.startDate} required />
                            <InputModal col="col-md-6" id="dian_end_date" label="Fecha fin" name="endDate" type="date"
                                value={record.endDate} onChange={setField('endDate')} error={errors.endDate} required />
                            <InputModal col="col-md-12" id="dian_key" label="Clave tecnica" name="technicalKey" type="text"
                                value={record.technicalKey} onChange={setField('technicalKey')} />
                            {/* QA CXC Bug 5 (2026-06-03 / IEEE AR-RF-17): notas max 500. */}
                            <InputModal col="col-md-12" id="dian_notes" label="Notas" name="notes" type="text"
                                maxLength={500}
                                value={record.notes} onChange={setField('notes')} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" className="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDianResolution;
