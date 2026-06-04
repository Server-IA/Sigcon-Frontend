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
const API_REGIMES       = ['api', 'v1', 'resources', 'types-regimes'];
const API_ORGANIZATIONS = ['api', 'v1', 'resources', 'types-organizations'];
const API_WITHHOLDINGS  = ['api', 'v1', 'resources', 'withholdings'];

const CATALOG_BODY = { draw: 1, start: 0, length: 10000, columns: [], search: { value: '', regex: false } };

const STATUS_LABEL_MAP = { ACTIVE: 'Activo', BLOCKED: 'Bloqueado', INACTIVE: 'Inactivo' };
const ROLE_LABEL_MAP   = { CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado', CREDITOR: 'Acreedor', DEBTOR: 'Deudor', OTHER: 'Otro' };
const ROLE_ICON_MAP    = { CLIENT: 'ri-user-line', SUPPLIER: 'ri-store-line', EMPLOYEE: 'ri-briefcase-line', CREDITOR: 'ri-bank-line', DEBTOR: 'ri-money-dollar-circle-line', OTHER: 'ri-more-line' };

// La pestaña "Comercial" se eliminó del flujo de creación de tercero porque duplicaba
// la funcionalidad del submódulo Terceros → Datos Comerciales, que ya gestiona
// (con vigencia temporal e historial) los datos comerciales por tercero.
const TABS = [
    { id: 'general',    label: 'Datos Generales', icon: 'ri-user-3-line' },
    { id: 'roles',      label: 'Roles',           icon: 'ri-shield-user-line' },
    { id: 'fiscal',     label: 'Datos Fiscales',  icon: 'ri-file-text-line' },
    { id: 'contact',    label: 'Contacto',        icon: 'ri-phone-line' },
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
    const [regimesOpts, setRegimesOpts]           = useState([]);
    const [organizationsOpts, setOrganizationsOpts] = useState([]);
    const [withholdingsOpts, setWithholdingsOpts] = useState([]);
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
        fetchHelper.post(base_url(API_REGIMES), CATALOG_BODY, {}, 0)
            .then(res => setRegimesOpts((res?.data ?? []).map(r => ({ id: r.id, name: r.name }))))
            .catch(() => {});
        fetchHelper.post(base_url(API_ORGANIZATIONS), CATALOG_BODY, {}, 0)
            .then(res => setOrganizationsOpts((res?.data ?? []).map(o => ({ id: o.id, name: o.name }))))
            .catch(() => {});
        fetchHelper.post(base_url(API_WITHHOLDINGS), CATALOG_BODY, {}, 0)
            .then(res => setWithholdingsOpts((res?.data ?? []).map(w => ({ id: w.id, name: w.name || w.code || `Retencion ${w.id}` }))))
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
        // PT-07/PT-08 (TER-RF-02): validaciones de UI antes de enviar.
        const clientErrors = {};
        const bn = (thirdParty.businessName || '').trim();
        if (bn.length < 3 || bn.length > 255) {
            clientErrors.businessName = 'La razon social debe tener entre 3 y 255 caracteres';
        }
        for (const c of (thirdParty.contacts ?? [])) {
            const phone = (c.phone || '').trim();
            if (phone && !/^\d{7,12}$/.test(phone)) {
                clientErrors.contacts = 'El telefono de contacto solo puede contener digitos y debe tener entre 7 y 12 caracteres';
            }
            const email = (c.email || '').trim();
            if (email && (email.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
                clientErrors.contacts = 'El correo electronico del contacto no tiene un formato valido';
            }
        }
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setErrorMessage(clientErrors.contacts || 'Corrija los campos marcados antes de guardar.');
            return;
        }
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
                withholdingIds:     Array.isArray(thirdParty.withholdingIds)
                    ? thirdParty.withholdingIds.map(Number).filter(n => !isNaN(n) && n > 0)
                    : (typeof thirdParty.withholdingIds === 'string' && thirdParty.withholdingIds
                        ? thirdParty.withholdingIds.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                        : []),
                // Datos comerciales se registran aparte en el submodulo Datos Comerciales.
                creditLimit:        null,
                paymentTerms:       null,
                marketSegment:      null,
                contacts:           thirdParty.contacts ?? [],
                ...(thirdParty.status === 'BLOCKED' && {
                    blockingReason: thirdParty.blockReason,
                }),
            };
            await fetchHelper.post(url, payload, {}, 1000);

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '',
                typeOrganizationId: '', typeRegimenId: '', withholdingIds: [],
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
                                            onChange={(e) => setThirdParty({ ...thirdParty, nit: e.target.value.replace(/\D+/g, '') })}
                                            error={errors.nit}
                                            placeholder="Ej. 9001234567"
                                            inputMode="numeric"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-2 mb-4 mt-2">
                                        <InputModal
                                            type="text"
                                            id="tp_dv_create"
                                            label="DV"
                                            value={thirdParty.dv}
                                            onChange={(e) => setThirdParty({ ...thirdParty, dv: e.target.value.replace(/\D+/g, '') })}
                                            error={errors.dv}
                                            placeholder="0"
                                            inputMode="numeric"
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-5 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_typeOrganizationId_create"
                                            label="Tipo de Organización"
                                            value={thirdParty.typeOrganizationId}
                                            onChange={(val) => setThirdParty({ ...thirdParty, typeOrganizationId: val })}
                                            error={errors.typeOrganizationId}
                                            placeholder="Seleccione el tipo de organización"
                                            options={organizationsOpts}
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
                                        {/* PT-08 (TER-RF-02): ayuda de longitud de razon social. */}
                                        <small className={`d-block mt-1 ${(thirdParty.businessName || '').trim().length > 0 && ((thirdParty.businessName || '').trim().length < 3 || (thirdParty.businessName || '').trim().length > 255) ? 'text-danger' : 'text-muted'}`}>
                                            Debe contener entre 3 y 255 caracteres ({(thirdParty.businessName || '').trim().length}/255)
                                        </small>
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
                                        <InputSelectModal
                                            id="tp_typeRegimenId_create"
                                            label="Tipo de Régimen"
                                            value={thirdParty.typeRegimenId}
                                            onChange={(val) => setThirdParty({ ...thirdParty, typeRegimenId: val })}
                                            error={errors.typeRegimenId}
                                            placeholder="Seleccione el tipo de régimen"
                                            options={regimesOpts}
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_withholdingIds_create"
                                            label="Retenciones aplicables"
                                            value={thirdParty.withholdingIds}
                                            onChange={(val) => setThirdParty({ ...thirdParty, withholdingIds: val })}
                                            error={errors.withholdingIds}
                                            placeholder="Seleccione una o más retenciones"
                                            options={withholdingsOpts}
                                            multiple={true}
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
                                                    onChange={(e) => updateContact(idx, 'phone', e.target.value.replace(/\D+/g, ''))}
                                                    placeholder="Ej. 3001234567"
                                                    inputMode="numeric"
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

                        {/* Tab "Comercial" eliminado: los datos comerciales (credito, termino,
                            segmento) se gestionan en Terceros -> Datos Comerciales para evitar
                            duplicidad y aprovechar la vigencia temporal + historial de esa vista. */}

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
