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

    const onChange = (e) => {
        const { name, value } = e.target;
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
                            <InputModal col="col-md-6" label="# Resolucion" name="resolutionNumber" type="text"
                                value={record.resolutionNumber} onChange={onChange} error={errors.resolutionNumber} required />
                            <InputModal col="col-md-3" label="Prefijo" name="prefix" type="text"
                                value={record.prefix} onChange={onChange} error={errors.prefix} required />
                            <InputSelectModal col="col-md-3" label="Estado" name="status"
                                value={record.status} onChange={onChange} options={STATUS_OPTIONS} />
                            <InputModal col="col-md-6" label="Numero inicial" name="startNumber" type="number"
                                value={record.startNumber} onChange={onChange} error={errors.startNumber} required />
                            <InputModal col="col-md-6" label="Numero final" name="endNumber" type="number"
                                value={record.endNumber} onChange={onChange} error={errors.endNumber} required />
                            <InputModal col="col-md-6" label="Fecha inicio" name="startDate" type="date"
                                value={record.startDate} onChange={onChange} error={errors.startDate} required />
                            <InputModal col="col-md-6" label="Fecha fin" name="endDate" type="date"
                                value={record.endDate} onChange={onChange} error={errors.endDate} required />
                            <InputModal col="col-md-12" label="Clave tecnica" name="technicalKey" type="text"
                                value={record.technicalKey} onChange={onChange} />
                            <InputModal col="col-md-12" label="Notas" name="notes" type="text"
                                value={record.notes} onChange={onChange} />
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
