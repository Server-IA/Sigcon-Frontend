import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_STORE         = ['api', 'v1', 'third-parties', 'store'];
const API_COUNTRIES     = ['api', 'v1', 'resources', 'countries'];
const API_MUNICIPIOS    = ['api', 'v1', 'resources', 'municipalities'];
const API_PAYMENT_TERMS = ['api', 'v1', 'resources', 'payment-terms'];
const API_STATUSES      = ['api', 'v1', 'third-parties', 'statuses'];
const API_ROLES         = ['api', 'v1', 'third-parties', 'roles'];

const CATALOG_BODY = { draw: 1, start: 0, length: 10000, columns: [], search: { value: '', regex: false } };

const STATUS_LABEL_MAP = { ACTIVE: 'Activo', BLOCKED: 'Bloqueado', INACTIVE: 'Inactivo' };
const ROLE_LABEL_MAP   = { CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado', CREDITOR: 'Acreedor', DEBTOR: 'Deudor', OTHER: 'Otro' };
const ROLE_ICON_MAP    = { CLIENT: 'ri-user-line', SUPPLIER: 'ri-store-line', EMPLOYEE: 'ri-briefcase-line', CREDITOR: 'ri-bank-line', DEBTOR: 'ri-money-dollar-circle-line', OTHER: 'ri-more-line' };

const TABS = [
    { id: 'general',    label: 'Datos Generales', icon: 'ri-user-3-line' },
    { id: 'roles',      label: 'Roles',           icon: 'ri-shield-user-line' },
    { id: 'fiscal',     label: 'Datos Fiscales',  icon: 'ri-file-text-line' },
    { id: 'contact',    label: 'Contacto',        icon: 'ri-phone-line' },
    { id: 'commercial', label: 'Comercial',       icon: 'ri-store-2-line' },
];

const emptyContact = { position: '', phone: '', email: '', contactPerson: '' };

const CreateThirdParty = ({ modalRef, modalInstance, thirdParty, setThirdParty, dataTableRef, setThirdPartyCreate }) => {

    const [activeTab, setActiveTab] = useState('general');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [countries, setCountries]               = useState([]);
    const [allMunicipalities, setAllMunicipalities] = useState([]);
    const [municipalities, setMunicipalities]     = useState([]);
    const [paymentTermsOpts, setPaymentTermsOpts] = useState([]);
    const [selectedCountry, setSelectedCountry]   = useState('');
    // Opciones hardcodeadas con codes fijos — la condición status==='BLOCKED' siempre funciona
    const statusOpts = [
        { id: 'ACTIVE',   label: 'Activo' },
        { id: 'BLOCKED',  label: 'Bloqueado' },
        { id: 'INACTIVE', label: 'Inactivo' },
    ];
    const roleOpts = [
        { id: 'CLIENT',   label: 'Cliente',   icon: 'ri-user-line' },
        { id: 'SUPPLIER', label: 'Proveedor', icon: 'ri-store-line' },
        { id: 'EMPLOYEE', label: 'Empleado',  icon: 'ri-briefcase-line' },
        { id: 'CREDITOR', label: 'Acreedor',  icon: 'ri-bank-line' },
        { id: 'DEBTOR',   label: 'Deudor',    icon: 'ri-money-dollar-circle-line' },
        { id: 'OTHER',    label: 'Otro',      icon: 'ri-more-line' },
    ];
    // IDmaps cargados desde API — solo usados al construir el payload
    const [statusIdMap, setStatusIdMap] = useState({ ACTIVE: 1, BLOCKED: 2, INACTIVE: 3 });
    const [roleIdMap,   setRoleIdMap]   = useState({ CLIENT: 1, SUPPLIER: 2, EMPLOYEE: 3, CREDITOR: 4, DEBTOR: 5, OTHER: 6 });

    // Cargar catálogos al montar
    useEffect(() => {
        fetchHelper.post(base_url(API_COUNTRIES), CATALOG_BODY, {}, 0)
            .then(res => setCountries((res?.data ?? []).map(c => ({ id: c.id, label: c.name }))))
            .catch(() => {});
        fetchHelper.post(base_url(API_MUNICIPIOS), CATALOG_BODY, {}, 0)
            .then(res => setAllMunicipalities(res?.data ?? []))
            .catch(() => {});
        fetchHelper.post(base_url(API_PAYMENT_TERMS), CATALOG_BODY, {}, 0)
            .then(res => setPaymentTermsOpts((res?.data ?? []).map(p => ({ id: p.name ?? String(p.id), label: p.name ?? String(p.id) }))))
            .catch(() => {});
        // Solo cargamos los IDmaps desde la API (para construir payloads correctos)
        fetchHelper.get(base_url(API_STATUSES), {}, 0, false)
            .then(res => {
                const list = Array.isArray(res) ? res : (res?.data ?? []);
                const map = {};
                list.forEach(s => {
                    const code = Object.keys(STATUS_LABEL_MAP).find(k => STATUS_LABEL_MAP[k] === s.name || k === s.name);
                    if (code) map[code] = s.id;
                });
                if (Object.keys(map).length > 0) setStatusIdMap(map);
            }).catch(() => {});
        fetchHelper.get(base_url(API_ROLES), {}, 0, false)
            .then(res => {
                const list = Array.isArray(res) ? res : (res?.data ?? []);
                const map = {};
                list.forEach(r => {
                    const code = Object.keys(ROLE_LABEL_MAP).find(k => ROLE_LABEL_MAP[k] === r.name || k === r.name);
                    if (code) map[code] = r.id;
                });
                if (Object.keys(map).length > 0) setRoleIdMap(map);
            }).catch(() => {});
    }, []);

    // Filtrar municipios por país
    useEffect(() => {
        if (!selectedCountry) { setMunicipalities([]); return; }
        setMunicipalities(
            allMunicipalities
                .filter(m => String(m.country?.id) === String(selectedCountry))
                .map(m => ({ id: m.id, label: m.name }))
        );
    }, [selectedCountry, allMunicipalities]);

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
        setActiveTab('general');
        setSelectedCountry('');
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

    const addContact = () => setThirdParty({
        ...thirdParty,
        contacts: [...(thirdParty.contacts ?? []), { ...emptyContact }],
    });

    const removeContact = (idx) => setThirdParty({
        ...thirdParty,
        contacts: (thirdParty.contacts ?? []).filter((_, i) => i !== idx),
    });

    const updateContact = (idx, field, value) => {
        const contacts = [...(thirdParty.contacts ?? [])];
        contacts[idx] = { ...contacts[idx], [field]: value };
        setThirdParty({ ...thirdParty, contacts });
    };

    const handleCreate = async () => {
        try {
            const url = base_url(API_STORE);
            const payload = {
                nit:                thirdParty.nit,
                dv:                 thirdParty.dv,
                businessName:       thirdParty.businessName,
                roleIds:            (thirdParty.roles ?? []).map(r => roleIdMap[r]).filter(Boolean),
                statusId:           statusIdMap[thirdParty.status] ?? 1,
                municipalityId:     thirdParty.municipalityId ? Number(thirdParty.municipalityId) : null,
                typeOrganizationId: thirdParty.typeOrganizationId ? Number(thirdParty.typeOrganizationId) : null,
                typeRegimenId:      thirdParty.typeRegimenId ? Number(thirdParty.typeRegimenId) : null,
                withholdingIds:     thirdParty.withholdingIds
                    ? thirdParty.withholdingIds.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                    : [],
                creditLimit:        thirdParty.creditLimit ? Number(thirdParty.creditLimit) : null,
                paymentTerms:       thirdParty.paymentConditions,
                marketSegment:      thirdParty.marketSegment,
                contacts:           thirdParty.contacts ?? [],
                ...(thirdParty.status === 'BLOCKED' && {
                    blockingReason: thirdParty.blockReason,
                }),
            };
            await fetchHelper.post(url, payload, {}, 1000);

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '',
                typeOrganizationId: '', typeRegimenId: '', withholdingIds: '',
                roles: [], municipalityId: '',
                creditLimit: '', paymentConditions: '', marketSegment: '',
                contacts: [],
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
                                        <InputModal
                                            type="number"
                                            id="tp_typeOrganizationId_create"
                                            label="Tipo de Organización ID"
                                            value={thirdParty.typeOrganizationId}
                                            onChange={(e) => setThirdParty({ ...thirdParty, typeOrganizationId: e.target.value })}
                                            error={errors.typeOrganizationId}
                                            placeholder="Ej. 1"
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
                                    {roleOpts.map(role => {
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

                                <hr className="my-4" />

                                <p className="text-muted mb-3">Estado del tercero: <span className="text-danger">*</span></p>
                                <div className="row">
                                    <div className="col-md-4 mb-2">
                                        <InputSelectModal
                                            id="tp_status_create"
                                            label="Estado"
                                            value={thirdParty.status}
                                            onChange={(value) => setThirdParty({ ...thirdParty, status: value, blockReason: '' })}
                                            error={errors.status}
                                            placeholder="Seleccione estado"
                                            options={statusOpts}
                                            required={true}
                                        />
                                    </div>
                                </div>

                                {thirdParty.status === 'BLOCKED' && (
                                    <div className="row mt-3">
                                        <div className="col-md-12 mb-2">
                                            <TextareaModal
                                                id="tp_blockReason_create"
                                                label="Motivo de bloqueo"
                                                value={thirdParty.blockReason}
                                                onChange={(e) => setThirdParty({ ...thirdParty, blockReason: e.target.value })}
                                                error={errors.blockingReason}
                                                placeholder="Mínimo 20 caracteres"
                                                required={true}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Datos Fiscales ── */}
                        {activeTab === 'fiscal' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="number"
                                            id="tp_typeRegimenId_create"
                                            label="Tipo de Régimen ID"
                                            value={thirdParty.typeRegimenId}
                                            onChange={(e) => setThirdParty({ ...thirdParty, typeRegimenId: e.target.value })}
                                            error={errors.typeRegimenId}
                                            placeholder="Ej. 2"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_withholdingIds_create"
                                            label="IDs de Retenciones (separados por coma)"
                                            value={thirdParty.withholdingIds}
                                            onChange={(e) => setThirdParty({ ...thirdParty, withholdingIds: e.target.value })}
                                            error={errors.withholdingIds}
                                            placeholder="Ej. 1,3"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Contacto ── */}
                        {activeTab === 'contact' && (
                            <div>
                                <div className="row">
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_country_create"
                                            label="País"
                                            value={selectedCountry}
                                            onChange={(v) => {
                                                setSelectedCountry(v);
                                                setThirdParty({ ...thirdParty, municipalityId: '' });
                                            }}
                                            options={countries}
                                            placeholder="Seleccione país"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_municipalityId_create"
                                            label="Municipio"
                                            value={thirdParty.municipalityId}
                                            onChange={(v) => setThirdParty({ ...thirdParty, municipalityId: v })}
                                            error={errors.municipalityId}
                                            options={municipalities}
                                            placeholder={selectedCountry ? 'Seleccione municipio' : 'Primero seleccione un país'}
                                            required={true}
                                            disabled={!selectedCountry}
                                        />
                                    </div>
                                </div>

                                <hr className="my-3" />

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <p className="text-muted mb-0">Contactos:</p>
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addContact}>
                                        <i className="ri-add-line me-1"></i> Agregar Contacto
                                    </button>
                                </div>

                                {(thirdParty.contacts ?? []).length === 0 && (
                                    <p className="text-muted text-center py-3">No hay contactos. Haga clic en "Agregar Contacto".</p>
                                )}

                                {(thirdParty.contacts ?? []).map((contact, idx) => (
                                    <div key={idx} className="border rounded p-3 mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fw-semibold text-muted">Contacto #{idx + 1}</span>
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeContact(idx)}>
                                                <i className="ri-delete-bin-line"></i>
                                            </button>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="text"
                                                    id={`tp_contactPerson_${idx}_create`}
                                                    label="Persona de Contacto"
                                                    value={contact.contactPerson}
                                                    onChange={(e) => updateContact(idx, 'contactPerson', e.target.value)}
                                                    placeholder="Ej. Pedro Pérez"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="text"
                                                    id={`tp_position_${idx}_create`}
                                                    label="Cargo"
                                                    value={contact.position}
                                                    onChange={(e) => updateContact(idx, 'position', e.target.value)}
                                                    placeholder="Ej. Contador"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="tel"
                                                    id={`tp_contactPhone_${idx}_create`}
                                                    label="Teléfono"
                                                    value={contact.phone}
                                                    onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                                                    placeholder="Ej. 3001234567"
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="email"
                                                    id={`tp_contactEmail_${idx}_create`}
                                                    label="Email"
                                                    value={contact.email}
                                                    onChange={(e) => updateContact(idx, 'email', e.target.value)}
                                                    placeholder="Ej. contacto@empresa.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_paymentConditions_create"
                                            label="Condiciones de pago"
                                            value={thirdParty.paymentConditions}
                                            onChange={(v) => setThirdParty({ ...thirdParty, paymentConditions: v })}
                                            error={errors.paymentConditions}
                                            options={paymentTermsOpts}
                                            placeholder="Seleccione condición de pago"
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
