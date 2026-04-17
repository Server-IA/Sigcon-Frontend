import { useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para crear un nuevo Periodo Contable.
 * POST a /api/v1/accounting-periods/store
 */

/** Nombres de los meses (id 1-12) para el select. */
const MONTHS = [
    { id: 1,  name: 'Enero' },    { id: 2,  name: 'Febrero' },
    { id: 3,  name: 'Marzo' },    { id: 4,  name: 'Abril' },
    { id: 5,  name: 'Mayo' },     { id: 6,  name: 'Junio' },
    { id: 7,  name: 'Julio' },    { id: 8,  name: 'Agosto' },
    { id: 9,  name: 'Septiembre' }, { id: 10, name: 'Octubre' },
    { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' },
];

/** Genera opciones de años (actual -3 a actual +2). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current - 3; y <= current + 2; y++) {
        years.push({ id: y, name: String(y) });
    }
    return years;
};

const CreatePeriodo = ({ modalRef, modalInstance, onCreated }) => {
    const [form, setForm]                 = useState({
        year:  String(new Date().getFullYear()),
        month: String(new Date().getMonth() + 1),
        notes: '',
    });
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting]     = useState(false);

    /** Actualiza un campo del formulario. */
    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    /** Envia el formulario al backend. */
    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        if (!form.year || !form.month) {
            setErrorMessage('El año y el mes son obligatorios.');
            return;
        }

        const payload = {
            year:  Number(form.year),
            month: Number(form.month),
            notes: form.notes || null,
        };

        setSubmitting(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-periods', 'store']),
                payload, {}, 1000, true
            );
            modalInstance?.current?.hide();
            setForm({
                year:  String(new Date().getFullYear()),
                month: String(new Date().getMonth() + 1),
                notes: '',
            });
            if (onCreated) onCreated();
        } catch (err) {
            if (err?.errors) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al crear el periodo contable.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-calendar-line me-2" />Crear Periodo Contable
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="period_year" label="Año"
                                    value={form.year}
                                    onChange={v => set('year', v)}
                                    error={errors.year}
                                    options={getYearOptions()}
                                    placeholder="Seleccione año"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="period_month" label="Mes"
                                    value={form.month}
                                    onChange={v => set('month', v)}
                                    error={errors.month}
                                    options={MONTHS}
                                    placeholder="Seleccione mes"
                                    required={true}
                                />
                            </div>
                            <div className="col-12 mb-3">
                                <InputModal
                                    id="period_notes" label="Notas / Observaciones"
                                    value={form.notes}
                                    onChange={e => set('notes', e.target.value)}
                                    error={errors.notes}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                            <i className="ri-save-line me-1" />
                            {submitting ? 'Creando...' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePeriodo;
