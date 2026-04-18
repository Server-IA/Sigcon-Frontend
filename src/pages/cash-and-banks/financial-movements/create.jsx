import { useState, useEffect } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

/**
 * Modal para crear un nuevo movimiento financiero manual.
 * Asocia el movimiento a una cuenta bancaria y opcionalmente clasifica por NIC 7.
 */
const CreateFinancialMovement = ({ modalRef, modalInstance, dataTableRef, setItemCreate }) => {
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [form, setForm] = useState({
        bankAccountId: '',
        movementDate: '',
        amount: '',
        description: '',
        externalReference: '',
        flowActivity: '',
    });

    const flowActivityOptions = [
        { id: 'OPERATIVA', name: 'Operativa' },
        { id: 'INVERSION', name: 'Inversion' },
        { id: 'FINANCIACION', name: 'Financiacion' },
    ];

    useEffect(() => {
        loadBankAccounts();
    }, []);

    /**
     * Carga la lista de cuentas bancarias activas para el selector.
     */
    const loadBankAccounts = async () => {
        try {
            const { data, error } = await fetchHelper.post(
                base_url(['api', 'bank-accounts']),
                { draw: 1, start: 0, length: -1, search: { value: '', regex: false }, columns: [], order: [] },
                {},
                0
            );
            if (!error && data?.data) {
                setBankAccounts(data.data.map(acc => ({
                    id: acc.id,
                    name: `${acc.code || ''} - ${acc.accountName || ''}`,
                })));
            }
        } catch (e) {
            console.log('Error cargando cuentas bancarias:', e);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    /**
     * Envia el formulario para registrar el movimiento financiero.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');

        if (!form.bankAccountId) {
            setErrors({ bankAccountId: 'La cuenta bancaria es obligatoria' });
            return;
        }

        try {
            const url = base_url(['api', 'v1', 'financial-movements', 'store']) + `?bankAccountId=${form.bankAccountId}`;
            const body = {
                movementDate: form.movementDate,
                amount: form.amount ? Number(form.amount) : null,
                description: form.description,
                externalReference: form.externalReference,
                flowActivity: form.flowActivity || null,
            };

            await fetchHelper.post(url, body, {}, 1000);
            dataTableRef?.current?.ajax?.reload?.();
            modalInstance?.current?.hide();
            setItemCreate(true);
            setForm({
                bankAccountId: '',
                movementDate: '',
                amount: '',
                description: '',
                externalReference: '',
                flowActivity: '',
            });
        } catch (error) {
            if (error?.errors) {
                const fieldErrors = {};
                error.errors.forEach(err => {
                    if (err.field) fieldErrors[err.field] = err.message || err.defaultMessage;
                });
                setErrors(fieldErrors);
            }
            if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nuevo Movimiento Financiero</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {errorMessage && (
                                <div className="alert alert-danger">{errorMessage}</div>
                            )}

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InputSelectModal
                                        label="Cuenta Bancaria *"
                                        value={form.bankAccountId}
                                        onChange={(val) => handleChange('bankAccountId', val)}
                                        options={bankAccounts}
                                        error={errors.bankAccountId}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Fecha Movimiento *"
                                        type="date"
                                        value={form.movementDate}
                                        onChange={(e) => handleChange('movementDate', e.target.value)}
                                        error={errors.movementDate}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Monto *"
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => handleChange('amount', e.target.value)}
                                        error={errors.amount}
                                        placeholder="Positivo=ingreso, Negativo=egreso"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputSelectModal
                                        label="Actividad Flujo (NIC 7)"
                                        value={form.flowActivity}
                                        onChange={(val) => handleChange('flowActivity', val)}
                                        options={flowActivityOptions}
                                        error={errors.flowActivity}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Descripcion"
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        error={errors.description}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Referencia Externa"
                                        type="text"
                                        value={form.externalReference}
                                        onChange={(e) => handleChange('externalReference', e.target.value)}
                                        error={errors.externalReference}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar Movimiento</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateFinancialMovement;
