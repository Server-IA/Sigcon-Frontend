import { useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

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
            setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error al crear.' });
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
                        <div className="row g-3">
                            <InputModal col="col-md-6" id="dian_res_num" label="# Resolucion" name="resolutionNumber" type="text"
                                value={record.resolutionNumber} onChange={setField('resolutionNumber')} error={errors.resolutionNumber} required />
                            <InputModal col="col-md-3" id="dian_prefix" label="Prefijo" name="prefix" type="text"
                                value={record.prefix} onChange={setField('prefix')} error={errors.prefix} required />
                            <div className="col-md-3">
                                <InputSelectModal id="dian_status" label="Estado"
                                    value={record.status} onChange={setField('status')} options={STATUS_OPTIONS} />
                            </div>
                            <InputModal col="col-md-6" id="dian_start_num" label="Numero inicial" name="startNumber" type="number"
                                value={record.startNumber} onChange={setField('startNumber')} error={errors.startNumber} required />
                            <InputModal col="col-md-6" id="dian_end_num" label="Numero final" name="endNumber" type="number"
                                value={record.endNumber} onChange={setField('endNumber')} error={errors.endNumber} required />
                            <InputModal col="col-md-6" id="dian_start_date" label="Fecha inicio" name="startDate" type="date"
                                value={record.startDate} onChange={setField('startDate')} error={errors.startDate} required />
                            <InputModal col="col-md-6" id="dian_end_date" label="Fecha fin" name="endDate" type="date"
                                value={record.endDate} onChange={setField('endDate')} error={errors.endDate} required />
                            <InputModal col="col-md-12" id="dian_key" label="Clave tecnica" name="technicalKey" type="text"
                                value={record.technicalKey} onChange={setField('technicalKey')} />
                            <InputModal col="col-md-12" id="dian_notes" label="Notas" name="notes" type="text"
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
