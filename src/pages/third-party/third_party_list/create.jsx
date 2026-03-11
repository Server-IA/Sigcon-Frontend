import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_STORE = ['api', 'v1', 'third-parties', 'store'];

const PERSON_TYPES = [
    { id: 'NATURAL',  label: 'Natural' },
    { id: 'JURIDICA', label: 'Jurídica' },
];

const TAX_REGIMES = [
    { id: 'SIMPLIFIED', label: 'Simplificado' },
    { id: 'COMMON',     label: 'Común' },
];

// TODO: Confirmar IDs reales de roles con el backend (GET /api/v1/roles o similar)
const ROLE_ID_MAP = {
    CLIENT:   1,
    SUPPLIER: 2,
    EMPLOYEE: 3,
    CREDITOR: 4,
    DEBTOR:   5,
    OTHER:    6,
};

// TODO: Confirmar IDs reales de estado con el backend
const STATUS_ID_MAP = {
    ACTIVE:   1,
    INACTIVE: 2,
    BLOCKED:  3,
};

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

const CreateThirdParty = ({ modalRef, modalInstance, thirdParty, setThirdParty, dataTableRef, setThirdPartyCreate }) => {

    const [activeTab, setActiveTab] = useState('general');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
        setActiveTab('general');
    }, [thirdParty.id]);

    const toggleRole = (roleId) => {
        const roles = thirdParty.roles ?? [];
        setThirdParty({
            ...thirdParty,
            roles: roles.includes(roleId)
                ? roles.filter(r => r !== roleId)
                : [...roles, roleId],
        });
    };

    const handleCreate = async () => {
        try {
            const url = base_url(API_STORE);
            const payload = {
                nit:                    thirdParty.nit,
                dv:                     thirdParty.dv,
                businessName:           thirdParty.businessName,
                personType:             thirdParty.personType,
                roleIds:                (thirdParty.roles ?? []).map(r => ROLE_ID_MAP[r]).filter(Boolean),
                statusId:               STATUS_ID_MAP[thirdParty.status] ?? 1,
                city:                   thirdParty.city,
                department:             thirdParty.department,
                address:                thirdParty.address,
                country:                thirdParty.country,
                phone:                  thirdParty.phone,
                email:                  thirdParty.email,
                taxRegime:              thirdParty.taxRegime,
                fiscalResponsibilities: thirdParty.fiscalResponsibilities,
                withholdingInfo:        thirdParty.retentions,
                creditLimit:            thirdParty.creditLimit ? Number(thirdParty.creditLimit) : null,
                paymentTerms:           thirdParty.paymentConditions,
                marketSegment:          thirdParty.marketSegment,
            };
            await fetchHelper.post(url, payload, {}, 1000);

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '', personType: '',
                roles: [], taxRegime: '', fiscalResponsibilities: '', retentions: '',
                address: '', phone: '', email: '', city: '', department: '', country: '',
                creditLimit: '', paymentConditions: '', marketSegment: '',
                status: 'ACTIVE', blockReason: '',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setThirdPartyCreate(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al crear tercero:', error);
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
                        <h4 className="modal-title fw-bold">Registrar Tercero</h4>
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
                                    <div className="col-md-5 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_nit_create"
                                            label="NIT"
                                            value={thirdParty.nit}
                                            onChange={(e) => setThirdParty({ ...thirdParty, nit: e.target.value })}
                                            error={errors.nit}
                                            placeholder="Ej. 9001234567"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-2 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_dv_create"
                                            label="DV"
                                            value={thirdParty.dv}
                                            onChange={(e) => setThirdParty({ ...thirdParty, dv: e.target.value })}
                                            error={errors.dv}
                                            placeholder="0"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-5 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_personType_create"
                                            label="Tipo de Persona"
                                            value={thirdParty.personType}
                                            onChange={(value) => setThirdParty({ ...thirdParty, personType: value })}
                                            error={errors.personType}
                                            placeholder="Seleccione tipo"
                                            options={PERSON_TYPES}
                                            required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_businessName_create"
                                            label="Nombre / Razón Social"
                                            value={thirdParty.businessName}
                                            onChange={(e) => setThirdParty({ ...thirdParty, businessName: e.target.value })}
                                            error={errors.businessName}
                                            placeholder="Ej. EMPRESA EJEMPLO S.A.S."
                                            required={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Roles ── */}
                        {activeTab === 'roles' && (
                            <div>
                                {errors.roles && (
                                    <div className="alert alert-danger py-2 mb-3">{errors.roles}</div>
                                )}
                                <p className="text-muted mb-3">
                                    Seleccione al menos un rol para el tercero: <span className="text-danger">*</span>
                                </p>
                                <div className="row g-3">
                                    {ROLES.map(role => {
                                        const selected = (thirdParty.roles ?? []).includes(role.id);
                                        return (
                                            <div className="col-md-4 col-sm-6" key={role.id}>
                                                <div
                                                    className={`card border p-3 d-flex flex-row align-items-center gap-3 ${selected ? 'border-primary bg-label-primary' : ''}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => toggleRole(role.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mt-0 flex-shrink-0"
                                                        checked={selected}
                                                        onChange={() => toggleRole(role.id)}
                                                    />
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
                                            id="tp_taxRegime_create"
                                            label="Régimen Fiscal"
                                            value={thirdParty.taxRegime}
                                            onChange={(value) => setThirdParty({ ...thirdParty, taxRegime: value })}
                                            error={errors.taxRegime}
                                            placeholder="Seleccione el régimen"
                                            options={TAX_REGIMES}
                                            required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <TextareaModal
                                            id="tp_fiscalResponsibilities_create"
                                            label="Responsabilidades Fiscales"
                                            value={thirdParty.fiscalResponsibilities}
                                            onChange={(e) => setThirdParty({ ...thirdParty, fiscalResponsibilities: e.target.value })}
                                            error={errors.fiscalResponsibilities}
                                            placeholder="Ej. R-99-PN, 05-IVA, 07-RETE"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <TextareaModal
                                            id="tp_retentions_create"
                                            label="Retenciones aplicables"
                                            value={thirdParty.retentions}
                                            onChange={(e) => setThirdParty({ ...thirdParty, retentions: e.target.value })}
                                            error={errors.retentions}
                                            placeholder="Ej. Retención en la fuente, IVA, ICA"
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
                                        <InputModal
                                            type="text"
                                            id="tp_address_create"
                                            label="Dirección"
                                            value={thirdParty.address}
                                            onChange={(e) => setThirdParty({ ...thirdParty, address: e.target.value })}
                                            error={errors.address}
                                            placeholder="Ej. Cra 15 # 93-47"
                                            required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="tel"
                                            id="tp_phone_create"
                                            label="Teléfono"
                                            value={thirdParty.phone}
                                            onChange={(e) => setThirdParty({ ...thirdParty, phone: e.target.value })}
                                            error={errors.phone}
                                            placeholder="Ej. 3001234567"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="email"
                                            id="tp_email_create"
                                            label="Email"
                                            value={thirdParty.email}
                                            onChange={(e) => setThirdParty({ ...thirdParty, email: e.target.value })}
                                            error={errors.email}
                                            placeholder="Ej. contacto@empresa.com"
                                            required={true}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-4 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_city_create"
                                            label="Ciudad"
                                            value={thirdParty.city}
                                            onChange={(e) => setThirdParty({ ...thirdParty, city: e.target.value })}
                                            error={errors.city}
                                            placeholder="Ej. Bogotá"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_department_create"
                                            label="Departamento"
                                            value={thirdParty.department}
                                            onChange={(e) => setThirdParty({ ...thirdParty, department: e.target.value })}
                                            error={errors.department}
                                            placeholder="Ej. Cundinamarca"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_country_create"
                                            label="País"
                                            value={thirdParty.country}
                                            onChange={(e) => setThirdParty({ ...thirdParty, country: e.target.value })}
                                            error={errors.country}
                                            placeholder="Ej. COLOMBIA"
                                            required={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Comercial ── */}
                        {activeTab === 'commercial' && (
                            <div>
                                <p className="text-muted mb-3">Información comercial (opcional).</p>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="number"
                                            id="tp_creditLimit_create"
                                            label="Límite de crédito"
                                            value={thirdParty.creditLimit}
                                            onChange={(e) => setThirdParty({ ...thirdParty, creditLimit: e.target.value })}
                                            error={errors.creditLimit}
                                            placeholder="Ej. 5000000"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_marketSegment_create"
                                            label="Segmento de mercado"
                                            value={thirdParty.marketSegment}
                                            onChange={(e) => setThirdParty({ ...thirdParty, marketSegment: e.target.value })}
                                            error={errors.marketSegment}
                                            placeholder="Ej. Corporativo"
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <TextareaModal
                                            id="tp_paymentConditions_create"
                                            label="Condiciones de pago"
                                            value={thirdParty.paymentConditions}
                                            onChange={(e) => setThirdParty({ ...thirdParty, paymentConditions: e.target.value })}
                                            error={errors.paymentConditions}
                                            placeholder="Ej. Pago a 30 días"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            Registrar Tercero
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

export default CreateThirdParty;
