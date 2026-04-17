import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar un nuevo arqueo de caja.
 * POST a /api/v1/cash-audits/store
 * Carga las cajas activas desde /api/v1/cash/search para seleccion.
 */

const CreateCashAudit = ({ modalRef, modalInstance, dataTableRef, setItemCreate }) => {
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [cashes, setCashes]             = useState([]);

    const [audit, setAudit] = useState({
        cashId: '',
        auditDate: '',
        physicalBalance: '',
        notes: '',
    });

    const set = (field, value) => setAudit(prev => ({ ...prev, [field]: value }));

    /** Carga las cajas activas al montar el componente */
    useEffect(() => {
        const loadCashes = async () => {
            try {
                const response = await fetchHelper.post(
                    base_url(['api', 'v1', 'cash', 'search']),
                    { length: -1 },
                    {}, 0, false
                );
                if (response?.data && Array.isArray(response.data)) {
                    setCashes(response.data
                        .filter(c => c.cashStatus === 'ACTIVE')
                        .map(c => ({
                            id: c.id,
                            label: c.cashCode + ' - ' + c.cashName,
                        }))
                    );
                }
            } catch (err) {
                console.warn('Error al cargar cajas:', err);
            }
        };
        loadCashes();
    }, []);

    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        const payload = {
            cashId:          audit.cashId ? Number(audit.cashId) : null,
            auditDate:       audit.auditDate || null,
            physicalBalance: audit.physicalBalance !== '' ? Number(audit.physicalBalance) : null,
            notes:           audit.notes || null,
        };

        try {
            await fetchHelper.post(base_url(['api', 'v1', 'cash-audits', 'store']), payload, {}, 1000, true);
            modalInstance?.current?.hide();
            setItemCreate(true);
            setAudit({ cashId: '', auditDate: '', physicalBalance: '', notes: '' });
            dataTableRef?.current?.ajax?.reload?.();
        } catch (err) {
            if (err?.errors) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al registrar el arqueo.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-scales-3-line me-2" />Nuevo Arqueo de Caja
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="aud_cash" label="Caja"
                                    value={audit.cashId}
                                    onChange={v => set('cashId', v)}
                                    error={errors.cashId}
                                    options={cashes}
                                    placeholder="Seleccione caja"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="aud_date" label="Fecha del Arqueo" type="date"
                                    value={audit.auditDate}
                                    onChange={e => set('auditDate', e.target.value)}
                                    error={errors.auditDate}
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="aud_physical" label="Saldo fisico contado" type="number"
                                    value={audit.physicalBalance}
                                    onChange={e => set('physicalBalance', e.target.value)}
                                    error={errors.physicalBalance}
                                    required={true}
                                    min="0"
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="aud_notes" label="Notas / Observaciones"
                                    value={audit.notes}
                                    onChange={e => set('notes', e.target.value)}
                                    error={errors.notes}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                            <i className="ri-save-line me-1" />Registrar Arqueo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCashAudit;
