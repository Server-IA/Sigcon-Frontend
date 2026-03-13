import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// id va en el PATH: PUT /api/v1/third-parties/{id}
const API_UPDATE = (id) => ['api', 'v1', 'third-parties', id];
// id va en el PATH: PUT /api/v1/third-parties/{id}/roles-status
const API_UPDATE_ROLES_STATUS = (id) => ['api', 'v1', 'third-parties', id, 'roles-status'];

// TODO: Confirmar IDs reales de roles con el backend
const ROLE_ID_MAP = {
    CLIENT:   1,
    SUPPLIER: 2,
    EMPLOYEE: 3,
    CREDITOR: 4,
    DEBTOR:   5,
    OTHER:    6,
};

const STATUS_ID_MAP = {
    ACTIVE:   1,
    BLOCKED:  2,
    INACTIVE: 3,
};

const STATUSES = [
    { id: 'ACTIVE',   label: 'Activo' },
    { id: 'BLOCKED',  label: 'Bloqueado' },
    { id: 'INACTIVE', label: 'Inactivo' },
];

const ROLES = [
    { id: 'CLIENT',   label: 'Cliente',   icon: 'ri-user-line' },
    { id: 'SUPPLIER', label: 'Proveedor', icon: 'ri-store-line' },
    { id: 'EMPLOYEE', label: 'Empleado',  icon: 'ri-briefcase-line' },
    { id: 'CREDITOR', label: 'Acreedor',  icon: 'ri-bank-line' },
    { id: 'DEBTOR',   label: 'Deudor',    icon: 'ri-money-dollar-circle-line' },
    { id: 'OTHER',    label: 'Otro',      icon: 'ri-more-line' },
];

const TABS = [
    { id: 'general', label: 'Datos Generales', icon: 'ri-user-3-line' },
    { id: 'roles',   label: 'Roles',           icon: 'ri-shield-user-line' },
    { id: 'fiscal',  label: 'Datos Fiscales',  icon: 'ri-file-text-line' },
    { id: 'contact', label: 'Contacto',        icon: 'ri-phone-line' },
];

const emptyContact = { position: '', phone: '', email: '', contactPerson: '' };

const UpdatedThirdParty = ({ modalRef, modalInstance, thirdParty, setThirdParty, dataTableRef, setThirdPartyEdit, readOnly = false }) => {

    const [activeTab, setActiveTab] = useState('general');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [thirdPartyUpdated, setThirdPartyUpdated] = useState({
        id: '', nit: '', dv: '', businessName: '',
        typeOrganizationId: '', typeRegimenId: '', withholdingIds: '',
        roles: [], municipalityId: '',
        contacts: [],
        status: 'ACTIVE', blockReason: '',
    });

    useEffect(() => {
        setThirdPartyUpdated({
            id:                 thirdParty.id                 ?? '',
            nit:                thirdParty.nit                ?? '',
            dv:                 thirdParty.dv                 ?? '',
            businessName:       thirdParty.businessName       ?? '',
            typeOrganizationId: thirdParty.typeOrganizationId ?? '',
            typeRegimenId:      thirdParty.typeRegimenId      ?? '',
            withholdingIds:     thirdParty.withholdingIds     ?? '',
            roles:              thirdParty.roles              ?? [],
            municipalityId:     thirdParty.municipalityId     ?? '',
            contacts:           thirdParty.contacts           ?? [],
            status:             thirdParty.status             ?? 'ACTIVE',
            blockReason:        thirdParty.blockReason        ?? '',
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

    const addContact = () => setThirdPartyUpdated({
        ...thirdPartyUpdated,
        contacts: [...(thirdPartyUpdated.contacts ?? []), { ...emptyContact }],
    });

    const removeContact = (idx) => setThirdPartyUpdated({
        ...thirdPartyUpdated,
        contacts: (thirdPartyUpdated.contacts ?? []).filter((_, i) => i !== idx),
    });

    const updateContact = (idx, field, value) => {
        const contacts = [...(thirdPartyUpdated.contacts ?? [])];
        contacts[idx] = { ...contacts[idx], [field]: value };
        setThirdPartyUpdated({ ...thirdPartyUpdated, contacts });
    };

    const handleUpdate = async () => {
        try {
            // ── 1. Actualizar información general del tercero ──────────────────
            const url = base_url(API_UPDATE(thirdPartyUpdated.id));
            const payload = {
                businessName:   thirdPartyUpdated.businessName,
                municipalityId: thirdPartyUpdated.municipalityId ? Number(thirdPartyUpdated.municipalityId) : null,
                withholdingId: thirdPartyUpdated.withholdingIds
                    ? thirdPartyUpdated.withholdingIds.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                    : [],
                contacts: thirdPartyUpdated.contacts ?? [],
            };
            await fetchHelper.put(url, payload, {}, 1000);

            // ── 2. Actualizar roles y estado (endpoint dedicado) ───────────────
            const urlRolesStatus = base_url(API_UPDATE_ROLES_STATUS(thirdPartyUpdated.id));
            const rolesStatusPayload = {
                roleIds:  (thirdPartyUpdated.roles ?? []).map(r => ROLE_ID_MAP[r]).filter(Boolean),
                statusId: STATUS_ID_MAP[thirdPartyUpdated.status] ?? 1,
                // blockingReason requerido (>= 20 chars) cuando el estado es BLOQUEADO
                ...(thirdPartyUpdated.status === 'BLOCKED' && {
                    blockingReason: thirdPartyUpdated.blockReason,
                }),
            };
            await fetchHelper.put(urlRolesStatus, rolesStatusPayload, {}, 1000);

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '',
                typeOrganizationId: '', typeRegimenId: '', withholdingIds: '',
                roles: [], municipalityId: '',
                contacts: [],
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
                        <h4 className="modal-title fw-bold">{readOnly ? 'Ver Tercero' : 'Editar Tercero'}</h4>
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
                                            id="tp_status_update" label="Estado"
                                            value={thirdPartyUpdated.status}
                                            onChange={(value) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, status: value, blockReason: '' })}
                                            error={errors.status} placeholder="Seleccione estado"
                                            options={STATUSES} required={!readOnly}
                                            disabled={readOnly}
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-12 mb-4 mt-2">
                                        <InputModal
                                            type="text" id="tp_businessName_update" label="Nombre / Razón Social"
                                            value={thirdPartyUpdated.businessName}
                                            onChange={(e) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, businessName: e.target.value })}
                                            error={errors.businessName} placeholder="Ej. EMPRESA EJEMPLO S.A.S."
                                            required={!readOnly} disabled={readOnly} readOnly={readOnly}
                                        />
                                    </div>
                                </div>
                                {thirdPartyUpdated.status === 'BLOCKED' && (
                                    <div className="row">
                                        <div className="col-md-12 mb-4">
                                            <TextareaModal
                                                id="tp_blockReason_update" label="Motivo de bloqueo"
                                                value={thirdPartyUpdated.blockReason}
                                                onChange={(e) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, blockReason: e.target.value })}
                                                error={errors.blockReason} placeholder="Mínimo 20 caracteres"
                                                required={!readOnly} disabled={readOnly} readOnly={readOnly}
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
                                                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                                                    onClick={() => !readOnly && toggleRole(role.id)}
                                                >
                                                    <input type="checkbox" className="form-check-input mt-0 flex-shrink-0"
                                                        checked={selected} onChange={() => !readOnly && toggleRole(role.id)}
                                                        disabled={readOnly} />
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
                                        <InputModal
                                            type="text"
                                            id="tp_withholdingIds_update"
                                            label="IDs de Retenciones (separados por coma)"
                                            value={thirdPartyUpdated.withholdingIds}
                                            onChange={(e) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, withholdingIds: e.target.value })}
                                            error={errors.withholdingIds}
                                            placeholder="Ej. 1,3"
                                            disabled={readOnly} readOnly={readOnly}
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
                                        <InputModal type="number" id="tp_municipalityId_update" label="Municipio ID"
                                            value={thirdPartyUpdated.municipalityId}
                                            onChange={(e) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, municipalityId: e.target.value })}
                                            error={errors.municipalityId} placeholder="Ej. 1"
                                            required={!readOnly} disabled={readOnly} readOnly={readOnly} />
                                    </div>
                                </div>

                                <hr className="my-3" />

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <p className="text-muted mb-0">Contactos:</p>
                                    {!readOnly && (
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addContact}>
                                            <i className="ri-add-line me-1"></i> Agregar Contacto
                                        </button>
                                    )}
                                </div>

                                {(thirdPartyUpdated.contacts ?? []).length === 0 && (
                                    <p className="text-muted text-center py-3">No hay contactos. Haga clic en "Agregar Contacto".</p>
                                )}

                                {(thirdPartyUpdated.contacts ?? []).map((contact, idx) => (
                                    <div key={idx} className="border rounded p-3 mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fw-semibold text-muted">Contacto #{idx + 1}</span>
                                            {!readOnly && (
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeContact(idx)}>
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            )}
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="text"
                                                    id={`tp_contactPerson_${idx}_update`}
                                                    label="Persona de Contacto"
                                                    value={contact.contactPerson}
                                                    onChange={(e) => !readOnly && updateContact(idx, 'contactPerson', e.target.value)}
                                                    placeholder="Ej. Pedro Pérez"
                                                    disabled={readOnly} readOnly={readOnly}
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="text"
                                                    id={`tp_position_${idx}_update`}
                                                    label="Cargo"
                                                    value={contact.position}
                                                    onChange={(e) => !readOnly && updateContact(idx, 'position', e.target.value)}
                                                    placeholder="Ej. Contador"
                                                    disabled={readOnly} readOnly={readOnly}
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="tel"
                                                    id={`tp_contactPhone_${idx}_update`}
                                                    label="Teléfono"
                                                    value={contact.phone}
                                                    onChange={(e) => !readOnly && updateContact(idx, 'phone', e.target.value)}
                                                    placeholder="Ej. 3001234567"
                                                    disabled={readOnly} readOnly={readOnly}
                                                />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <InputModal
                                                    type="email"
                                                    id={`tp_contactEmail_${idx}_update`}
                                                    label="Email"
                                                    value={contact.email}
                                                    onChange={(e) => !readOnly && updateContact(idx, 'email', e.target.value)}
                                                    placeholder="Ej. contacto@empresa.com"
                                                    disabled={readOnly} readOnly={readOnly}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        {!readOnly && (
                            <button type="button" className="btn btn-primary" onClick={handleUpdate}>
                                Guardar cambios
                            </button>
                        )}
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
