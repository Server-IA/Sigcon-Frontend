import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/** Modal de edicion de una Resolucion DIAN. */

const STATUS_OPTIONS = [
    { id: 'ACTIVE', name: 'Vigente' },
    { id: 'EXPIRED', name: 'Vencida' },
    { id: 'EXHAUSTED', name: 'Agotada' },
];

const UpdatedDianResolution = ({ modalRef, modalInstance, dataTableRef, record, setMessage, reloadAlerts }) => {
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (record) {
            setForm({
                resolutionNumber: record.resolutionNumber || '',
                prefix: record.prefix || '',
                startNumber: record.startNumber ?? '',
                endNumber: record.endNumber ?? '',
                startDate: record.startDate || '',
                endDate: record.endDate || '',
                technicalKey: record.technicalKey || '',
                status: record.status || 'ACTIVE',
                notes: record.notes || '',
            });
        }
    }, [record]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!record?.id) return;
        setErrors({});
        try {
            await fetchHelper.put(
                base_url(['api', 'v1', 'ar', 'dian', 'resolutions', 'update', record.id]),
                {
                    ...form,
                    startNumber: Number(form.startNumber),
                    endNumber: Number(form.endNumber),
                },
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Resolucion DIAN actualizada.' });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            reloadAlerts && reloadAlerts();
        } catch (err) {
            if (Array.isArray(err?.errors)) {
                const e = {};
                err.errors.forEach((x) => { e[x.field] = x.message; });
                setErrors(e);
            }
            setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error al actualizar.' });
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <form className="modal-content" onSubmit={onSubmit}>
                    <div className="modal-header">
                        <h5 className="modal-title">Editar Resolucion DIAN</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        <div className="row g-3">
                            <InputModal col="col-md-6" label="# Resolucion" name="resolutionNumber" type="text"
                                value={form.resolutionNumber || ''} onChange={onChange} error={errors.resolutionNumber} required />
                            <InputModal col="col-md-3" label="Prefijo" name="prefix" type="text"
                                value={form.prefix || ''} onChange={onChange} error={errors.prefix} required />
                            <InputSelectModal col="col-md-3" label="Estado" name="status"
                                value={form.status || 'ACTIVE'} onChange={onChange} options={STATUS_OPTIONS} />
                            <InputModal col="col-md-6" label="Numero inicial" name="startNumber" type="number"
                                value={form.startNumber ?? ''} onChange={onChange} error={errors.startNumber} required />
                            <InputModal col="col-md-6" label="Numero final" name="endNumber" type="number"
                                value={form.endNumber ?? ''} onChange={onChange} error={errors.endNumber} required />
                            <InputModal col="col-md-6" label="Fecha inicio" name="startDate" type="date"
                                value={form.startDate || ''} onChange={onChange} error={errors.startDate} required />
                            <InputModal col="col-md-6" label="Fecha fin" name="endDate" type="date"
                                value={form.endDate || ''} onChange={onChange} error={errors.endDate} required />
                            <InputModal col="col-md-12" label="Clave tecnica" name="technicalKey" type="text"
                                value={form.technicalKey || ''} onChange={onChange} />
                            <InputModal col="col-md-12" label="Notas" name="notes" type="text"
                                value={form.notes || ''} onChange={onChange} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" className="btn btn-primary">Guardar cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdatedDianResolution;
