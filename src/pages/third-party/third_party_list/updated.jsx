import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_UPDATE              = (id) => ['api', 'v1', 'third-parties', id];
const API_UPDATE_ROLES_STATUS = (id) => ['api', 'v1', 'third-parties', id, 'roles-status'];
const API_COUNTRIES           = ['api', 'v1', 'resources', 'countries'];
const API_MUNICIPIOS          = ['api', 'v1', 'resources', 'municipalities'];
const API_PAYMENT_TERMS       = ['api', 'v1', 'resources', 'payment-terms'];
const API_STATUSES            = ['api', 'v1', 'third-parties', 'statuses'];
const API_ROLES               = ['api', 'v1', 'third-parties', 'roles'];
const API_COMMERCIAL_GET      = (id) => ['api', 'v1', 'commercial-data', id];
const API_COMMERCIAL_POST     = ['api', 'v1', 'commercial-data'];
const API_COMMERCIAL_PUT      = (id) => ['api', 'v1', 'commercial-data', id];
const API_REGIMES             = ['api', 'v1', 'resources', 'types-regimes'];
const API_ORGANIZATIONS       = ['api', 'v1', 'resources', 'types-organizations'];
const API_WITHHOLDINGS        = ['api', 'v1', 'resources', 'withholdings'];

const CATALOG_BODY = { draw: 1, start: 0, length: 10000, columns: [], search: { value: '', regex: false } };

const STATUS_LABEL_MAP = { ACTIVE: 'Activo', BLOCKED: 'Bloqueado', INACTIVE: 'Inactivo' };
const ROLE_LABEL_MAP   = { CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado', CREDITOR: 'Acreedor', DEBTOR: 'Deudor', OTHER: 'Otro' };
const ROLE_ICON_MAP    = { CLIENT: 'ri-user-line', SUPPLIER: 'ri-store-line', EMPLOYEE: 'ri-briefcase-line', CREDITOR: 'ri-bank-line', DEBTOR: 'ri-money-dollar-circle-line', OTHER: 'ri-more-line' };

const RISK_LEVELS = [
    { id: 'LOW',    label: 'Bajo' },
    { id: 'MEDIUM', label: 'Medio' },
    { id: 'HIGH',   label: 'Alto' },
];

// Pestaña "Comercial" eliminada para consistencia con el flujo de creacion.
// Los datos comerciales se gestionan en Terceros -> Datos Comerciales (con vigencia
// temporal e historial). Evita doble punto de entrada para los mismos campos.
const TABS = [
    { id: 'general',    label: 'Datos Generales',   icon: 'ri-user-3-line' },
    { id: 'roles',      label: 'Roles',             icon: 'ri-shield-user-line' },
    { id: 'fiscal',     label: 'Datos Fiscales',    icon: 'ri-file-text-line' },
    { id: 'contact',    label: 'Contacto',          icon: 'ri-phone-line' },
    // HU-TER-05 (2026-04-27): vincular cuentas bancarias existentes (no se
    // crean nuevas aqui; vienen del modulo Bancos y Cajas).
    { id: 'banks',      label: 'Cuentas Bancarias', icon: 'ri-bank-line' },
];

const API_BANK_ACCOUNTS_SEARCH = ['api', 'v1', 'bank-accounts', 'search'];
const API_TPBA = (thirdPartyId) => ['api', 'v1', 'third-parties', thirdPartyId, 'bank-accounts'];
const API_TPBA_DELETE = (thirdPartyId, linkId) => ['api', 'v1', 'third-parties', thirdPartyId, 'bank-accounts', linkId];

const emptyContact = { position: '', phone: '', email: '', contactPerson: '' };

const UpdatedThirdParty = ({ modalRef, modalInstance, thirdParty, setThirdParty, dataTableRef, setThirdPartyEdit, readOnly = false }) => {

    const [activeTab, setActiveTab] = useState('general');
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [thirdPartyUpdated, setThirdPartyUpdated] = useState({
        id: '', nit: '', dv: '', businessName: '',
        typeOrganizationId: '', typeRegimenId: '', withholdingIds: [],
        roles: [], municipalityId: '', countryId: '',
        contacts: [],
        status: 'ACTIVE', blockReason: '',
    });

    const [countries, setCountries]               = useState([]);
    const [allMunicipalities, setAllMunicipalities] = useState([]);
    const [municipalities, setMunicipalities]     = useState([]);
    const [paymentTermsOpts, setPaymentTermsOpts] = useState([]);
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

    const emptyCommercial = { paymentTermId: '', limitCredit: '', riskLevel: '' };
    const [commercial, setCommercial]       = useState(emptyCommercial);
    const [commercialId, setCommercialId]   = useState(null); // null = no existe aún
    const [commercialLoading, setCommercialLoading] = useState(false);

    // HU-TER-05: cuentas bancarias vinculadas al tercero
    const [bankAccountsAvailable, setBankAccountsAvailable] = useState([]);  // todas las del sistema
    const [bankAccountsLinked, setBankAccountsLinked]       = useState([]);  // vinculadas al tercero (snapshot BD)
    // QA-BLOQUE-AK (2026-04-29): los cambios sobre cuentas bancarias se acumulan
    // en pending* y se persisten SOLO al hacer "Guardar cambios". Si el usuario
    // cierra el modal sin guardar, las pendientes se descartan.
    const [pendingBankLinks,   setPendingBankLinks]   = useState([]);   // [{tempId, bankAccountId, label}]
    const [pendingBankUnlinks, setPendingBankUnlinks] = useState([]);   // [linkIds existentes a borrar]
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [bankAccountsLoading, setBankAccountsLoading]     = useState(false);

    // Catalogos FK para tipos de organizacion, regimen y retenciones
    const [regimesOpts, setRegimesOpts]           = useState([]);
    const [organizationsOpts, setOrganizationsOpts] = useState([]);
    const [withholdingsOpts, setWithholdingsOpts] = useState([]);

    // Cargar catálogos al montar
    useEffect(() => {
        fetchHelper.post(base_url(API_COUNTRIES), CATALOG_BODY, {}, 0)
            .then(res => setCountries((res?.data ?? []).map(c => ({ id: c.id, label: c.name }))))
            .catch(() => {});
        fetchHelper.post(base_url(API_MUNICIPIOS), CATALOG_BODY, {}, 0)
            .then(res => setAllMunicipalities(res?.data ?? []))
            .catch(() => {});
        fetchHelper.post(base_url(API_PAYMENT_TERMS), CATALOG_BODY, {}, 0)
            .then(res => setPaymentTermsOpts((res?.data ?? []).map(p => ({ id: p.id, label: p.name ?? String(p.id) }))))
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
        // Las opciones de UI son fijas (statusOpts/roleOpts) para garantizar estabilidad
        fetchHelper.get(base_url(API_STATUSES), {}, 0, false)
            .then(res => {
                const list = Array.isArray(res) ? res : (res?.data ?? []);
                // Mapeamos por ID numérico usando STATUS_LABEL_MAP para encontrar el code
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

    // Filtrar municipios cuando cambia el país
    useEffect(() => {
        if (!thirdPartyUpdated.countryId) { setMunicipalities([]); return; }
        setMunicipalities(
            allMunicipalities
                .filter(m => String(m.country?.id) === String(thirdPartyUpdated.countryId))
                .map(m => ({ id: m.id, label: m.name }))
        );
    }, [thirdPartyUpdated.countryId, allMunicipalities]);

    useEffect(() => {
        setThirdPartyUpdated({
            id:                 thirdParty.id                 ?? '',
            nit:                thirdParty.nit                ?? '',
            dv:                 thirdParty.dv                 ?? '',
            businessName:       thirdParty.businessName       ?? '',
            typeOrganizationId: thirdParty.typeOrganizationId ?? '',
            typeRegimenId:      thirdParty.typeRegimenId      ?? '',
            withholdingIds:     Array.isArray(thirdParty.withholdingIds) ? thirdParty.withholdingIds
                                  : (thirdParty.withholdings ? thirdParty.withholdings.map(w => w.id || w) : []),
            roles:              thirdParty.roles              ?? [],
            municipalityId:     thirdParty.municipalityId     ?? '',
            countryId:          thirdParty.countryId          ?? '',
            contacts:           thirdParty.contacts           ?? [],
            status:             thirdParty.status             ?? 'ACTIVE',
            blockReason:        thirdParty.blockReason        ?? '',
        });
        setErrors({});
        setErrorMessage('');
        setActiveTab('general');

        // Cargar datos comerciales del tercero
        setCommercial(emptyCommercial);
        setCommercialId(null);
        if (thirdParty.id) {
            setCommercialLoading(true);
            fetchHelper.get(base_url(API_COMMERCIAL_GET(thirdParty.id)), {}, 0, false)
                .then(res => {
                    // El backend puede retornar { data: {...} } o el objeto directamente
                    const d = res?.data ?? res;
                    setCommercialId(d?.id ?? null);
                    setCommercial({
                        paymentTermId: d?.paymentTermId ?? d?.paymentTerm?.id ?? '',
                        limitCredit:   d?.limitCredit   ?? d?.creditLimit    ?? '',
                        riskLevel:     d?.riskLevel?.name ?? d?.riskLevel    ?? '',
                    });
                })
                .catch(() => {
                    // 404 = no existe; se creará con POST
                    setCommercialId(null);
                    setCommercial(emptyCommercial);
                })
                .finally(() => setCommercialLoading(false));
        }

        // HU-TER-05: cargar cuentas bancarias del sistema y las vinculadas al tercero
        setBankAccountsLinked([]);
        setSelectedBankAccountId('');
        // QA-BLOQUE-AK: limpiar pendientes al recargar el tercero
        setPendingBankLinks([]);
        setPendingBankUnlinks([]);
        if (thirdParty.id) {
            setBankAccountsLoading(true);
            // Listar cuentas disponibles del tenant (DataTable search global)
            fetchHelper.post(base_url(API_BANK_ACCOUNTS_SEARCH), CATALOG_BODY, {}, 0)
                .then(res => {
                    const list = res?.data ?? [];
                    setBankAccountsAvailable(list.map(a => ({
                        id: a.id,
                        label: `${a.code ?? '-'} - ${a.bankDTO?.name ?? a.bank?.name ?? 'Banco'} - ${a.accountNumber ?? ''}`,
                    })));
                })
                .catch(() => setBankAccountsAvailable([]));
            // Listar las ya vinculadas
            fetchHelper.get(base_url(API_TPBA(thirdParty.id)), {}, 0, false)
                .then(res => setBankAccountsLinked(res?.data ?? []))
                .catch(() => setBankAccountsLinked([]))
                .finally(() => setBankAccountsLoading(false));
        }
    }, [thirdParty]);

    /**
     * HU-TER-05 + QA-BLOQUE-AK (2026-04-29): "vincular" ya NO golpea el backend.
     * Solo agrega la cuenta a la lista de pendientes en memoria. La persistencia
     * ocurre al hacer click en "Guardar cambios".
     */
    const handleLinkBankAccount = () => {
        if (!selectedBankAccountId) {
            setErrorMessage('Seleccione una cuenta bancaria para vincular.');
            return;
        }
        const id = Number(selectedBankAccountId);
        // Sacar metadata desde el catalogo cargado (label "code - banco - num")
        const meta = bankAccountsAvailable.find(a => a.id === id);
        if (!meta) {
            setErrorMessage('No se pudo resolver la cuenta seleccionada.');
            return;
        }
        // Si ya esta vinculada (BD) y no se va a unlink, evitar duplicar
        const alreadyLinked = bankAccountsLinked.some(l =>
            l.bankAccountId === id && !pendingBankUnlinks.includes(l.id));
        const alreadyPending = pendingBankLinks.some(p => p.bankAccountId === id);
        if (alreadyLinked || alreadyPending) {
            setErrorMessage('Esa cuenta ya esta vinculada o en pendiente.');
            return;
        }
        setPendingBankLinks(prev => [...prev, {
            tempId: `tmp_${Date.now()}_${id}`,
            bankAccountId: id,
            label: meta.label,
        }]);
        setSelectedBankAccountId('');
        setErrorMessage('');
    };

    /**
     * HU-TER-05 + QA-BLOQUE-AK: "desvincular" ya NO golpea el backend.
     * - Si la entrada es persistida (tiene linkId real), se agrega a pendingBankUnlinks.
     * - Si la entrada es pending (tempId), se quita de pendingBankLinks.
     */
    const handleUnlinkBankAccount = (entry) => {
        if (entry.tempId) {
            setPendingBankLinks(prev => prev.filter(p => p.tempId !== entry.tempId));
            return;
        }
        if (entry.id) {
            setPendingBankUnlinks(prev => prev.includes(entry.id) ? prev : [...prev, entry.id]);
        }
    };

    /**
     * QA-BLOQUE-AK: aplicar al backend las cuentas pendientes (link/unlink).
     * Llamado solo desde handleUpdate. Si alguna falla, propaga el error
     * al usuario y mantiene el estado pendiente para que pueda corregir.
     */
    const applyPendingBankAccountChanges = async (tpId) => {
        // 1. Unlinks primero (libera cuentas si se reasignan dentro del mismo save)
        for (const linkId of pendingBankUnlinks) {
            await fetchHelper.delete(
                base_url(API_TPBA_DELETE(tpId, linkId)),
                null, {}, 1000
            );
        }
        // 2. Links nuevos
        for (const pl of pendingBankLinks) {
            await fetchHelper.post(
                base_url(API_TPBA(tpId)),
                { bankAccountId: pl.bankAccountId, isPrimary: false },
                {}, 1000
            );
        }
    };

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
            // HU-TER-02 E2 + HU-TER-03 E1 (2026-04-27): faltaban typeOrganizationId,
            // typeRegimenId y el nombre correcto del campo `withholdingIds` (estaba
            // como singular `withholdingId`). Por eso al editar datos fiscales no se
            // persistian.
            const payload = {
                businessName:   thirdPartyUpdated.businessName,
                municipalityId: thirdPartyUpdated.municipalityId ? Number(thirdPartyUpdated.municipalityId) : null,
                typeOrganizationId: thirdPartyUpdated.typeOrganizationId
                    ? Number(thirdPartyUpdated.typeOrganizationId) : null,
                typeRegimenId: thirdPartyUpdated.typeRegimenId
                    ? Number(thirdPartyUpdated.typeRegimenId) : null,
                withholdingIds: Array.isArray(thirdPartyUpdated.withholdingIds)
                    ? thirdPartyUpdated.withholdingIds.map(Number).filter(n => !isNaN(n) && n > 0)
                    : (typeof thirdPartyUpdated.withholdingIds === 'string' && thirdPartyUpdated.withholdingIds
                        ? thirdPartyUpdated.withholdingIds.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                        : []),
                contacts: thirdPartyUpdated.contacts ?? [],
            };
            await fetchHelper.put(url, payload, {}, 1000);

            // ── 2. Actualizar roles y estado (endpoint dedicado) ───────────────
            const urlRolesStatus = base_url(API_UPDATE_ROLES_STATUS(thirdPartyUpdated.id));
            const rolesStatusPayload = {
                roleIds:  (thirdPartyUpdated.roles ?? []).map(r => roleIdMap[r]).filter(Boolean),
                statusId: statusIdMap[thirdPartyUpdated.status] ?? 1,
                // blockingReason requerido (>= 20 chars) cuando el estado es BLOQUEADO
                ...(thirdPartyUpdated.status === 'BLOCKED' && {
                    blockingReason: thirdPartyUpdated.blockReason,
                }),
            };
            await fetchHelper.put(urlRolesStatus, rolesStatusPayload, {}, 1000);

            // QA-BLOQUE-AK (2026-04-29): aplicar cambios pendientes de cuentas
            // bancarias (link/unlink) ANTES de cerrar el modal. Si falla alguno,
            // propaga el error y conserva el modal abierto.
            try {
                await applyPendingBankAccountChanges(thirdPartyUpdated.id);
                setPendingBankLinks([]);
                setPendingBankUnlinks([]);
            } catch (e) {
                const msg = e?.msg || e?.message || 'No se pudieron guardar los cambios de cuentas bancarias.';
                setErrorMessage(msg);
                setActiveTab('banks');
                return; // No cerrar el modal — usuario debe reintentar
            }

            // Los datos comerciales (creditLimit, paymentTerm, riskLevel) ya NO se
            // guardan desde este modal — se gestionan en el submodulo dedicado
            // Terceros -> Datos Comerciales, que ademas mantiene vigencia temporal
            // e historial de cambios.

            setThirdParty({
                id: '', nit: '', dv: '', businessName: '',
                typeOrganizationId: '', typeRegimenId: '', withholdingIds: [],
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
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                    // HU-TER-04 E5 (2026-04-27): el backend devuelve `roleIds`
                    // pero el JSX de la pestania Roles lee `errors.roles`.
                    // Si se intenta quitar el unico rol activo, el alert
                    // nunca aparece. Mapear por compatibilidad.
                    if (err.field === 'roleIds') fieldErrors.roles = err.message;
                });
                setErrors(fieldErrors);
                // Mostrar tambien banner global para que el usuario lo vea
                // sin importar la pestania activa.
                if (fieldErrors.roles) setErrorMessage(fieldErrors.roles);
                // Cambiar a la pestania Roles si el error es de roles
                if (fieldErrors.roles) setActiveTab('roles');
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
                                            options={statusOpts} required={!readOnly}
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
                                    {roleOpts.map(role => {
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
                                        <InputSelectModal
                                            id="tp_typeOrganizationId_update"
                                            label="Tipo de Organización"
                                            value={thirdPartyUpdated.typeOrganizationId}
                                            onChange={(val) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, typeOrganizationId: val })}
                                            error={errors.typeOrganizationId}
                                            placeholder="Seleccione el tipo de organización"
                                            options={organizationsOpts}
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_typeRegimenId_update"
                                            label="Tipo de Régimen"
                                            value={thirdPartyUpdated.typeRegimenId}
                                            onChange={(val) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, typeRegimenId: val })}
                                            error={errors.typeRegimenId}
                                            placeholder="Seleccione el tipo de régimen"
                                            options={regimesOpts}
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div className="col-md-12 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_withholdingIds_update"
                                            label="Retenciones aplicables"
                                            value={thirdPartyUpdated.withholdingIds}
                                            onChange={(val) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, withholdingIds: val })}
                                            error={errors.withholdingIds}
                                            placeholder="Seleccione una o más retenciones"
                                            options={withholdingsOpts}
                                            multiple={true}
                                            disabled={readOnly}
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
                                            id="tp_country_update"
                                            label="País"
                                            value={thirdPartyUpdated.countryId}
                                            onChange={(v) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, countryId: v, municipalityId: '' })}
                                            options={countries}
                                            placeholder="Seleccione país"
                                            required={!readOnly}
                                            disabled={readOnly}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4 mt-2">
                                        <InputSelectModal
                                            id="tp_municipalityId_update"
                                            label="Municipio"
                                            value={thirdPartyUpdated.municipalityId}
                                            onChange={(v) => !readOnly && setThirdPartyUpdated({ ...thirdPartyUpdated, municipalityId: v })}
                                            error={errors.municipalityId}
                                            options={municipalities}
                                            placeholder={thirdPartyUpdated.countryId ? 'Seleccione municipio' : 'Primero seleccione un país'}
                                            required={!readOnly}
                                            disabled={readOnly || !thirdPartyUpdated.countryId}
                                        />
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

                        {/* Tab "Comercial" eliminado para consistencia con create.jsx.
                            Gestionar desde Terceros -> Datos Comerciales. */}

                        {/* HU-TER-05 (2026-04-27): Cuentas bancarias vinculadas */}
                        {activeTab === 'banks' && (
                            <div>
                                <p className="text-muted mb-3">
                                    Vincule cuentas bancarias existentes al tercero. Las cuentas se gestionan
                                    desde el modulo <strong>Bancos y Cajas &gt; Cuentas Bancarias</strong>;
                                    aqui solo se asocian al tercero.
                                </p>

                                {!readOnly && (
                                    <div className="row align-items-end mb-3">
                                        <div className="col-md-9">
                                            <InputSelectModal
                                                id="tp_link_bank_account"
                                                label="Cuenta bancaria"
                                                value={selectedBankAccountId}
                                                onChange={(v) => setSelectedBankAccountId(v)}
                                                options={bankAccountsAvailable.filter(a => {
                                                    // Excluir las ya vinculadas en BD que NO esten pendientes de unlink
                                                    const linkedActive = bankAccountsLinked.some(l =>
                                                        l.bankAccountId === a.id && !pendingBankUnlinks.includes(l.id));
                                                    // Excluir las que ya estan en pending links
                                                    const pendingLinked = pendingBankLinks.some(p => p.bankAccountId === a.id);
                                                    return !linkedActive && !pendingLinked;
                                                })}
                                                placeholder="Seleccione una cuenta bancaria"
                                                emptyMessage={bankAccountsAvailable.length === 0
                                                    ? 'No hay cuentas bancarias registradas en el sistema. Cree una en Bancos y Cajas.'
                                                    : 'Todas las cuentas disponibles ya estan vinculadas a este tercero.'}
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <button
                                                type="button"
                                                className="btn btn-primary w-100"
                                                onClick={handleLinkBankAccount}
                                                disabled={!selectedBankAccountId}
                                            >
                                                <i className="ri-link me-1"></i> Vincular
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(pendingBankLinks.length > 0 || pendingBankUnlinks.length > 0) && (
                                    <div className="alert alert-warning py-2 mb-3" role="alert">
                                        <i className="ri-information-line me-1"></i>
                                        Hay cambios pendientes en cuentas bancarias.
                                        Se aplicaran al hacer click en <strong>Guardar cambios</strong>.
                                        Si cierra el modal sin guardar, se descartaran.
                                    </div>
                                )}

                                <hr className="my-3" />

                                <p className="text-muted mb-2">Cuentas vinculadas:</p>
                                {bankAccountsLoading && (
                                    <p className="text-muted text-center py-3">Cargando...</p>
                                )}
                                {(() => {
                                    // Vista combinada: BD - pendingUnlinks + pendingLinks
                                    const visibleLinked = bankAccountsLinked.filter(l =>
                                        !pendingBankUnlinks.includes(l.id));
                                    const totalRows = visibleLinked.length + pendingBankLinks.length;
                                    if (bankAccountsLoading) return null;
                                    if (totalRows === 0) {
                                        return (
                                            <p className="text-muted text-center py-3">
                                                Este tercero no tiene cuentas bancarias vinculadas.
                                            </p>
                                        );
                                    }
                                    return (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Codigo</th>
                                                        <th>Banco</th>
                                                        <th>Numero de cuenta</th>
                                                        <th>Principal</th>
                                                        <th>Estado</th>
                                                        {!readOnly && <th style={{width:'80px'}}>Acciones</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleLinked.map(link => (
                                                        <tr key={`bd_${link.id}`}>
                                                            <td>{link.bankAccountCode ?? '-'}</td>
                                                            <td>{link.bankName ?? '-'}</td>
                                                            <td>{link.accountNumber ?? '-'}</td>
                                                            <td>
                                                                {link.isPrimary
                                                                    ? <span className="badge bg-label-primary">Si</span>
                                                                    : <span className="badge bg-label-secondary">No</span>}
                                                            </td>
                                                            <td><span className="badge bg-label-success">Guardada</span></td>
                                                            {!readOnly && (
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        title="Desvincular (pendiente hasta Guardar)"
                                                                        onClick={() => handleUnlinkBankAccount(link)}
                                                                    >
                                                                        <i className="ri-link-unlink"></i>
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {pendingBankLinks.map(pl => (
                                                        <tr key={pl.tempId} className="table-warning">
                                                            <td colSpan={4}>{pl.label}</td>
                                                            <td><span className="badge bg-label-warning">Pendiente</span></td>
                                                            {!readOnly && (
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        title="Quitar de pendientes"
                                                                        onClick={() => handleUnlinkBankAccount(pl)}
                                                                    >
                                                                        <i className="ri-close-line"></i>
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
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
