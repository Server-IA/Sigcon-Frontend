import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// TODO: Actualizar URL cuando el backend provea el endpoint
const API_UPDATE = ['thirdParty', 'update'];

const PERSON_TYPES = [
    { id: 'NATURAL', label: 'Natural' },
    { id: 'JURIDICAL', label: 'Jurídica' },
];

const TAX_REGIMES = [
    { id: 'SIMPLIFIED', label: 'Simplificado' },
    { id: 'COMMON', label: 'Común' },
];

const STATUSES = [
    { id: 'ACTIVE', label: 'Activo' },
    { id: 'BLOCKED', label: 'Bloqueado' },
    { id: 'INACTIVE', label: 'Inactivo' },
];

const ROLES = [
    { id: 'CLIENT', label: 'Cliente', icon: 'ri-user-line' },
    { id: 'SUPPLIER', label: 'Proveedor', icon: 'ri-store-line' },
    { id: 'EMPLOYEE', label: 'Empleado', icon: 'ri-briefcase-line' },
    { id: 'CREDITOR', label: 'Acreedor', icon: 'ri-bank-line' },
    { id: 'DEBTOR', label: 'Deudor', icon: 'ri-money-dollar-circle-line' },
    { id: 'OTHER', label: 'Otro', icon: 'ri-more-line' },
];

const TABS = [
    { id: 'general', label: 'Datos Generales', icon: 'ri-user-3-line' },
    { id: 'roles', label: 'Roles', icon: 'ri-shield-user-line' },
    { id: 'fiscal', label: 'Datos Fiscales', icon: 'ri-file-text-line' },
    { id: 'contact', label: 'Contacto', icon: 'ri-phone-line' },
    { id: 'commercial', label: 'Comercial', icon: 'ri-store-2-line' },
];

const UpdatedThirdParty = ({ modalRef, modalInstance, thirdParty, setThirdParty, dataTableRef, setThirdPartyEdit }) => {

    const [activeTab, setActiveTab] = useState('general');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [thirdPartyUpdated, setThirdPartyUpdated] = useState({
        id: '', nit: '', dv: '', businessName: '', personType: '',
        roles: [], taxRegime: '', fiscalResponsibilities: '', retentions: '',
        address: '', phone: '', email: '', city: '', department: '',
        creditLimit: '', paymentConditions: '', marketSegment: '',
        status: 'ACTIVE', blockReason: '',
    });

    useEffect(() => {
        setThirdPartyUpdated({
            id: thirdParty.id ?? '',
            nit: thirdParty.nit ?? '',
            dv: thirdParty.dv ?? '',
            businessName: thirdParty.businessName ?? '',
            personType: thirdParty.personType ?? '',
            roles: thirdParty.roles ?? [],
            taxRegime: thirdParty.taxRegime ?? '',
            fiscalResponsibilities: thirdParty.fiscalResponsibilities ?? '',
            retentions: thirdParty.retentions ?? '',
            address: thirdParty.address ?? '',
            phone: thirdParty.phone ?? '',
            email: thirdParty.email ?? '',
            city: thirdParty.city ?? '',
            department: thirdParty.department ?? '',
            creditLimit: thirdParty.creditLimit ?? '',
            paymentConditions: thirdParty.paymentConditions ?? '',
            marketSegment: thirdParty.marketSegment ?? '',
            status: thirdParty.status ?? 'ACTIVE',
            blockReason: thirdParty.blockReason ?? '',
        });
        setErrors({});
        setErrorMessage('');
        setActiveTab('general');
    }, [thirdParty]);

    const toggleRole = (roleId) => {
        const roles = thirdPartyUpdated.roles ?? [];
        setThirdPartyUpdated({
            ...thirdPartyUpdated,
            roles: roles.includes(roleId)
                ? roles.filter(r => r !== roleId)
                : [...roles, roleId],
        });
    };

    const handleUpdate = async () => {
        try {
            const url = base_url(API_UPDATE);
            const payload = {
                id: Number(thirdPartyUpdated.id),
                businessName: thirdPartyUpdated.businessName,
                personType: thirdPartyUpdated.personType,
                roles: thirdPartyUpdated.roles,
                taxRegime: thirdPartyUpdated.taxRegime,
                fiscalResponsibilities: thirdPartyUpdated.fiscalResponsibilities,
                retentions: thirdPartyUpdated.retentions,
                address: thirdPartyUpdated.address,
                phone: thirdPartyUpdated.phone,
                email: thirdPartyUpdated.email,
                city: thirdPartyUpdated.city,
                department: thirdPartyUpdated.department,
                creditLimit: thirdPartyUpdated.creditLimit ? Number(thirdPartyUpdated.creditLimit) : null,
                paymentConditions: thirdPartyUpdated.paymentConditions,
                marketSegment: thirdPartyUpdated.marketSegment,
                status: thirdPartyUpdated.status,
                blockReason: thirdPartyUpdated.blockReason,
            };
            await fetchHelper.put(url, payload, {}, 1000);

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '', personType: '',
                roles: [], taxRegime: '', fiscalResponsibilities: '', retentions: '',
                address: '', phone: '', email: '', city: '', department: '',
                creditLimit: '', paymentConditions: '', marketSegment: '',
                status: 'ACTIVE', blockReason: '',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setThirdPartyEdit(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al actualizar tercero:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title fw-bold">Editar Tercero</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* Alert error general */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage ? '' : 'd-none'}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                            <span>{errorMessage}</span>
                        </div>

                        {/* Nav Tabs */}
                        <ul className="nav nav-tabs mb-4 flex-wrap">
                            {TABS.map(tab => (
                                <li className="nav-item" key={tab.id}>
                                    <button
                                        type="button"
                                        className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <i className={`${tab.icon} me-1`}></i>
                                        {tab.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* ── Tab: Datos Generales ── */}
                        {activeTab === 'general' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-2 mb-4 mt-2">
                                        <div style={{ cursor: 'not-allowed' }}>
                                            <InputModal type="text" id="tp_id_update" label="ID"
                                                value={thirdPartyUpdated.id} onChange={() => { }}
                                                error="" placeholder="" disabled={true} readOnly={true} />
                                        </div>
                                    </div>
                                    <div className="col-md-4 mb-4 mt-2">
                                        <div style={{ cursor: 'not-allowed' }}>
                                            <InputModal type="text" id="tp_nit_update" label="NIT"
                                                value={thirdPartyUpdated.nit} onChange={() => { }}
                                                error="" placeholder="" disabled={true} readOnly={true} />
                                        </div>
                                    </div>
                                    <div className="col-md-2 mb-4 mt-2">
                                        <div style={{ cursor: 'not-allowed' }}>
                                            <InputModal type="text" id="tp_dv_update" label="DV"
                                                value={thirdPartyUpdated.dv} onChange={() => { }}
                                                error="" placeholder="" disabled={true} readOnly={true} />
                                        </div>
                                    </div>
                                    <div className="col-md-4 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_personType_update" label="Tipo de Persona"
                                            value={thirdPartyUpdated.personType}
                                            onChange={(value) => setThirdPartyUpdated({ ...thirdPartyUpdated, personType: value })}
                                            error={errors.personType} placeholder="Seleccione tipo"
                                            options={PERSON_TYPES} required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-8 mb-4 mt-2">
                                        <InputModal
                                            type="text" id="tp_businessName_update" label="Nombre / Razón Social"
                                            value={thirdPartyUpdated.businessName}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, businessName: e.target.value })}
                                            error={errors.businessName} placeholder="Ej. EMPRESA EJEMPLO S.A.S." required={true}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_status_update" label="Estado"
                                            value={thirdPartyUpdated.status}
                                            onChange={(value) => setThirdPartyUpdated({ ...thirdPartyUpdated, status: value })}
                                            error={errors.status} placeholder="Seleccione estado"
                                            options={STATUSES} required={true}
                                        />
                                    </div>
                                </div>
                                {thirdPartyUpdated.status === 'BLOCKED' && (
                                    <div className="row">
                                        <div className="col-md-12 mb-4">
                                            <TextareaModal
                                                id="tp_blockReason_update" label="Motivo de bloqueo"
                                                value={thirdPartyUpdated.blockReason}
                                                onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, blockReason: e.target.value })}
                                                error={errors.blockReason} placeholder="Mínimo 20 caracteres" required={true}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Roles ── */}
                        {activeTab === 'roles' && (
                            <div>
                                {errors.roles && <div className="alert alert-danger py-2 mb-3">{errors.roles}</div>}
                                <p className="text-muted mb-3">Seleccione al menos un rol: <span className="text-danger">*</span></p>
                                <div className="row g-3">
                                    {ROLES.map(role => {
                                        const selected = (thirdPartyUpdated.roles ?? []).includes(role.id);
                                        return (
                                            <div className="col-md-4 col-sm-6" key={role.id}>
                                                <div
                                                    className={`card border p-3 d-flex flex-row align-items-center gap-3 ${selected ? 'border-primary bg-label-primary' : ''}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => toggleRole(role.id)}
                                                >
                                                    <input type="checkbox" className="form-check-input mt-0 flex-shrink-0"
                                                        checked={selected} onChange={() => toggleRole(role.id)} />
                                                    <i className={`${role.icon} fs-5 ${selected ? 'text-primary' : 'text-muted'}`}></i>
                                                    <span className="fw-semibold">{role.label}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Datos Fiscales ── */}
                        {activeTab === 'fiscal' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_taxRegime_update" label="Régimen Fiscal"
                                            value={thirdPartyUpdated.taxRegime}
                                            onChange={(value) => setThirdPartyUpdated({ ...thirdPartyUpdated, taxRegime: value })}
                                            error={errors.taxRegime} placeholder="Seleccione el régimen"
                                            options={TAX_REGIMES} required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <TextareaModal
                                            id="tp_fiscalResponsibilities_update" label="Responsabilidades Fiscales"
                                            value={thirdPartyUpdated.fiscalResponsibilities}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, fiscalResponsibilities: e.target.value })}
                                            error={errors.fiscalResponsibilities} placeholder="Ej. R-99-PN, 05-IVA, 07-RETE"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <TextareaModal
                                            id="tp_retentions_update" label="Retenciones aplicables"
                                            value={thirdPartyUpdated.retentions}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, retentions: e.target.value })}
                                            error={errors.retentions} placeholder="Ej. Retención en la fuente, IVA, ICA"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Contacto ── */}
                        {activeTab === 'contact' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <InputModal type="text" id="tp_address_update" label="Dirección"
                                            value={thirdPartyUpdated.address}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, address: e.target.value })}
                                            error={errors.address} placeholder="Ej. Cra 15 # 93-47" required={true} />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="tel" id="tp_phone_update" label="Teléfono"
                                            value={thirdPartyUpdated.phone}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, phone: e.target.value })}
                                            error={errors.phone} placeholder="Ej. 3001234567" required={true} />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="email" id="tp_email_update" label="Email"
                                            value={thirdPartyUpdated.email}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, email: e.target.value })}
                                            error={errors.email} placeholder="Ej. contacto@empresa.com" required={true} />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="text" id="tp_city_update" label="Ciudad"
                                            value={thirdPartyUpdated.city}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, city: e.target.value })}
                                            error={errors.city} placeholder="Ej. Bogotá" required={true} />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="text" id="tp_department_update" label="Departamento"
                                            value={thirdPartyUpdated.department}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, department: e.target.value })}
                                            error={errors.department} placeholder="Ej. Cundinamarca" required={true} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Comercial ── */}
                        {activeTab === 'commercial' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="number" id="tp_creditLimit_update" label="Límite de crédito"
                                            value={thirdPartyUpdated.creditLimit}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, creditLimit: e.target.value })}
                                            error={errors.creditLimit} placeholder="Ej. 5000000" />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal type="text" id="tp_marketSegment_update" label="Segmento de mercado"
                                            value={thirdPartyUpdated.marketSegment}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, marketSegment: e.target.value })}
                                            error={errors.marketSegment} placeholder="Ej. Corporativo" />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <TextareaModal id="tp_paymentConditions_update" label="Condiciones de pago"
                                            value={thirdPartyUpdated.paymentConditions}
                                            onChange={(e) => setThirdPartyUpdated({ ...thirdPartyUpdated, paymentConditions: e.target.value })}
                                            error={errors.paymentConditions} placeholder="Ej. Pago a 30 días" />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleUpdate}>
                            Guardar cambios
                        </button>
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedThirdParty;
