import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { validateText } from '../../../utils/fieldValidations';

const UpdateBankAccount = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    costCenters,
    banks,
    currencyTypes,
}) => {
    const [errors, setErrors] = useState({});
    const [error,  setError]  = useState({ message: '', type: '', show: false });

    // Sucursales del banco asociado a la cuenta
    const [branches,        setBranches]        = useState([]);
    // const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingDetail,   setLoadingDetail]   = useState(false);

    // HU-TER-05 (2026-04-27): terceros vinculados a esta cuenta bancaria
    // (lookup inverso). Permite al contador asignar/quitar terceros sin salir
    // del modal de la cuenta.
    const [linkedThirdParties, setLinkedThirdParties] = useState([]);
    const [thirdPartyOptions, setThirdPartyOptions]   = useState([]);
    const [selectedThirdPartyId, setSelectedThirdPartyId] = useState('');
    const [linksLoading, setLinksLoading]             = useState(false);
    // QA-BLOQUE-AK (2026-04-29): pendientes hasta "Guardar Cambios". Si el usuario
    // cierra el modal sin guardar, las pendientes se descartan.
    const [pendingTpLinks,   setPendingTpLinks]   = useState([]);   // [{tempId, thirdPartyId, label}]
    const [pendingTpUnlinks, setPendingTpUnlinks] = useState([]);   // [linkIds existentes]

    // Carga listado de terceros (para dropdown) + terceros vinculados al abrir
    useEffect(() => {
        if (!record?.id) {
            setLinkedThirdParties([]);
            setThirdPartyOptions([]);
            setSelectedThirdPartyId('');
            setPendingTpLinks([]);
            setPendingTpUnlinks([]);
            return;
        }
        // QA-BLOQUE-AK: limpiar pendientes al recargar el record
        setPendingTpLinks([]);
        setPendingTpUnlinks([]);
        setLinksLoading(true);
        // Listar terceros del tenant (DataTable search)
        fetchHelper.post(
            base_url(['api', 'v1', 'third-parties', 'search']),
            { draw: 1, start: 0, length: 10000, columns: [], search: { value: '', regex: false } },
            {}, 0
        )
            .then(res => setThirdPartyOptions((res?.data ?? []).map(tp => ({
                id: tp.id,
                label: `${tp.nit ?? ''}/${tp.dv ?? ''} - ${tp.businessName ?? ''}`,
            }))))
            .catch(() => setThirdPartyOptions([]));
        // Lookup inverso: terceros que tienen esta cuenta vinculada
        fetchHelper.get(
            base_url(['api', 'v1', 'bank-accounts', record.id, 'third-parties']),
            {}, 0, false
        )
            .then(res => setLinkedThirdParties(res?.data ?? []))
            .catch(() => setLinkedThirdParties([]))
            .finally(() => setLinksLoading(false));
    }, [record?.id]);

    /**
     * HU-TER-05 + QA-BLOQUE-AK (2026-04-29): "vincular" agrega a pendientes en
     * memoria. La persistencia ocurre solo al hacer click en "Guardar Cambios".
     * Ademas: una cuenta bancaria solo puede pertenecer a UN tercero (validado en
     * backend). Si ya hay uno vinculado, se bloquea aqui antes de llamar.
     */
    const handleLinkThirdParty = () => {
        if (!selectedThirdPartyId) {
            setError({ message: 'Seleccione un tercero para vincular.', type: 'warning', show: true });
            return;
        }
        const id = Number(selectedThirdPartyId);
        const visibleLinked = linkedThirdParties.filter(l => !pendingTpUnlinks.includes(l.id));
        if (visibleLinked.length > 0 || pendingTpLinks.length > 0) {
            setError({
                message: 'Una cuenta bancaria solo puede pertenecer a un tercero. Desvincule el actual antes de agregar otro.',
                type: 'warning', show: true,
            });
            return;
        }
        const meta = thirdPartyOptions.find(t => t.id === id);
        if (!meta) {
            setError({ message: 'No se pudo resolver el tercero seleccionado.', type: 'danger', show: true });
            return;
        }
        setPendingTpLinks([{ tempId: `tmp_${Date.now()}_${id}`, thirdPartyId: id, label: meta.label }]);
        setSelectedThirdPartyId('');
        setError({ message: '', type: '', show: false });
    };

    /**
     * HU-TER-05 + QA-BLOQUE-AK: "desvincular" agrega a pendientes (si tiene id)
     * o quita del array de links pendientes (si tiene tempId).
     */
    const handleUnlinkThirdParty = (entry) => {
        if (entry.tempId) {
            setPendingTpLinks(prev => prev.filter(p => p.tempId !== entry.tempId));
            return;
        }
        if (entry.id) {
            setPendingTpUnlinks(prev => prev.includes(entry.id) ? prev : [...prev, entry.id]);
        }
    };

    /** Aplicar pendientes al backend, llamado desde handleSave */
    const applyPendingTpChanges = async () => {
        // Unlinks primero (libera la cuenta antes de potencial reasignacion)
        for (const linkId of pendingTpUnlinks) {
            const link = linkedThirdParties.find(l => l.id === linkId);
            if (!link) continue;
            await fetchHelper.delete(
                base_url(['api', 'v1', 'third-parties', link.thirdPartyId, 'bank-accounts', linkId]),
                null, {}, 1000
            );
        }
        // Luego links nuevos
        for (const pl of pendingTpLinks) {
            await fetchHelper.post(
                base_url(['api', 'v1', 'bank-accounts', record.id, 'third-parties']),
                { thirdPartyId: pl.thirdPartyId, isPrimary: false },
                {}, 1000
            );
        }
    };

    // ── Al abrir el modal: cargar detalle completo (GET /{id}) ────────────────
    // El endpoint de búsqueda (DataTable) NO devuelve allowsOverdraft, creditLimit, etc.
    // Solo GET /{id} trae todos los campos
    useEffect(() => {
        const el = modalRef.current;
        if (!el) return;

        // const onShow = async () => {
        //     if (!record.id) return;
        //     setLoadingDetail(true);
        //     setError({ message: '', type: '', show: false });
        //     setErrors({});

        //     try {
        //         const d = res.data || res;

        //         // Actualizar record con TODOS los campos del detalle
        //         setRecord(prev => ({
        //             ...prev,
        //             accountName:      d.accountName      ?? prev.accountName,
        //             branchName:       d.branchName       ?? prev.branchName      ?? '',
        //             bankBranchId:     d.bankBranchId     ?? prev.bankBranchId    ?? '',
        //             accountExecutive: d.accountExecutive ?? prev.accountExecutive ?? '',
        //             bankPhone:        d.bankPhone        ?? prev.bankPhone        ?? '',
        //             description:      d.description      ?? prev.description      ?? '',
        //             allowsOverdraft:  d.allowsOverdraft  ?? false,
        //             creditLimit:      d.creditLimit      ?? 0,
        //             notifyLowBalance: d.notifyLowBalance ?? false,
        //             minimumBalance:   d.minimumBalance   ?? 0,
        //             costCenterId:     d.costCenterId     ?? prev.costCenterId    ?? '',
        //             changeReason:     '',
        //         }));
        //         console.log(d.bankBranch, 'd.bankBranch');
        //         setBranches(d.bankBranch ? [d.bankBranch] : []);

        //     } catch (err) {
        //         console.error('Error cargando detalle para editar:', err);
        //         setError({ message: 'No se pudo cargar el detalle de la cuenta.', type: 'danger', show: true });
        //     } finally {
        //         setLoadingDetail(false);
        //     }
        // };

        // const onHide = () => {
        //     setErrors({});
        //     setError({ message: '', type: '', show: false });
        //     setBranches([]);
        // };

        // el.addEventListener('show.bs.modal',   onShow);
        // el.addEventListener('hidden.bs.modal', onHide);
        // return () => {
        //     el.removeEventListener('show.bs.modal',   onShow);
        //     el.removeEventListener('hidden.bs.modal', onHide);
        // };
    }, [modalRef, record.id]);

    useEffect(() => {
        if (!record.bank) return;
        const branches = banks.find(b => b.id === record.bank.id)?.branches.map(b => ({ id: b.id, label: b.name || b.label || b.address }));
        console.log(branches, 'branches');  
        setBranches(branches);
    }, [record.bank, banks]);

    // ── Guardar cambios ───────────────────────────────────────────────────────
    // QA Bloque AU (2026-05-06) — Bug 3 + Bug 4: validacion frontend de
    // campos requeridos antes del PUT. Si fallan, abortar.
    const validateRequiredUpdate = () => {
        const next = {};
        // QA BNK (2026-06-03 / doc validaciones BNK-RF-02): longitudes + clase de caracteres.
        next.accountName      = validateText(record.accountName,      { required: true, min: 3, max: 100, patternKey: 'name',       label: 'El nombre de cuenta' });
        next.accountExecutive = validateText(record.accountExecutive, { min: 0,         max: 100, patternKey: 'personName',  label: 'El ejecutivo de cuenta' });
        next.description      = validateText(record.description,      { min: 0,         max: 500, patternKey: 'description', label: 'La descripción' });
        // Motivo del cambio: min 5, max 300 (doc BNK-RF-02).
        next.changeReason     = validateText(record.changeReason,     { required: true, min: 5, max: 300, patternKey: 'description', label: 'El motivo del cambio' });
        Object.keys(next).forEach(k => { if (next[k] == null) delete next[k]; });
        return next;
    };

    const handleSave = async () => {
        const fieldErrors = validateRequiredUpdate();
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            setError({
                message: 'Por favor complete los campos obligatorios marcados.',
                type: 'danger',
                show: true,
            });
            return;
        }
        try {
            // QA Bloque AU (2026-05-06) — Bug 4: solo enviar campos editables
            // segun la HU. El backend ignora code/accountNumber/bankId/currencyTypeId
            // y antes el front los mandaba dando la falsa sensacion de "se
            // actualizo" cuando esos campos no cambiaron en BD.
            const body = {
                accountName:      record.accountName,
                bankBranchId:     Number(record.bankBranchId) || null,
                accountExecutive: record.accountExecutive || '',
                bankPhone:        record.bankPhone        || '',
                description:      record.description      || '',
                allowsOverdraft:  record.allowsOverdraft  || false,
                creditLimit:      Number(record.creditLimit)    || 0,
                notifyLowBalance: record.notifyLowBalance  || false,
                minimumBalance:   Number(record.minimumBalance) || 0,
                costCenterId:     record.costCenterId ? Number(record.costCenterId) : null,
                changeReason:     record.changeReason,
            };

            await fetchHelper.put(base_url(['api', 'v1', 'bank-accounts', record.id]), body, {}, 1000);

            // QA-BLOQUE-AK: aplicar pendientes de terceros vinculados ANTES de cerrar
            try {
                await applyPendingTpChanges();
                setPendingTpLinks([]);
                setPendingTpUnlinks([]);
            } catch (e) {
                const msg = e?.msg || e?.message || 'No se pudieron guardar los cambios de terceros.';
                setError({ message: msg, type: 'danger', show: true });
                return; // No cerrar — el usuario debe corregir
            }

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setMessage({ message: 'Cuenta bancaria actualizada correctamente.', type: 'success', show: true });

        } catch (err) {
            console.error(err);
            if (err?.errors?.length) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            } else if (err?.msg) {
                setError({ message: err.msg, type: 'danger', show: true });
            }
        }
    };

    // QA HU-002 E1: al cambiar el valor de un campo, limpiamos cualquier error
    // previo que tuviera ese campo. Antes el mensaje *"El motivo de cambio debe
    // tener al menos 10 caracteres"* persistia aun despues de corregir el texto.
    const field = (key, val) => {
        setRecord(prev => ({ ...prev, [key]: val }));
        if (errors && errors[key]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-edit-line me-2"></i>Editar Cuenta Bancaria
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={error.message}
                            type={error.type}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
                        />

                        {loadingDetail ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Cargando...</span>
                                </div>
                                <p className="mt-2 text-muted">Cargando datos de la cuenta...</p>
                            </div>
                        ) : (
                            <>
                                {/* QA Bloque AU (2026-05-06) — Bug 3 + Bug 4:
                                    El código, número de cuenta, banco y moneda
                                    SIEMPRE son readOnly tras la creacion. La
                                    HU lo exige (preservacion contable + DIAN).
                                    Antes el flag `record.used` permitia
                                    editarlos cuando la cuenta no tenia
                                    movimientos, pero el backend ignora esos
                                    campos en update -> el front mostraba
                                    "actualizado correctamente" cuando en
                                    realidad solo se editaron los campos de
                                    datos editables. */}
                                <div className="alert alert-info py-2 mb-4">
                                    <i className="ri-information-line me-1"></i>
                                    El código, número de cuenta, banco y moneda <strong>no pueden modificarse</strong> después de la creación. Para corregirlos, anule la cuenta y registre una nueva.
                                </div>

                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-file-list-3-line me-1"></i>Información de referencia
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-3 mb-3">
                                        <InputModal type="text" id="upd_code" label="Código"
                                            value={record.code} readOnly disabled />
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <InputModal type="text" id="upd_accountNumberMasked" label="N° Cuenta"
                                            value={record.accountNumberMasked} readOnly disabled />
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <InputModal type="text" id="upd_bankName" label="Banco"
                                            value={record.bankName || record?.bank?.name || ''} readOnly disabled />
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <InputModal type="text" id="upd_currencyCode" label="Moneda"
                                            value={record.currencyCode || record?.currency?.isoCode || ''} readOnly disabled />
                                    </div>
                                </div>

                                {/* ── Campos editables ────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-edit-2-line me-1"></i>Datos editables
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-4">
                                        <InputModal
                                            type="text" id="upd_accountName" label="Nombre de cuenta"
                                            value={record.accountName}
                                            maxLength={100}
                                            onChange={e => field('accountName', e.target.value)}
                                            error={errors.accountName} required
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        {/* QA Bloque AU (2026-05-06) — Bug 3:
                                            NO permitir deseleccionar centro
                                            de costo (preservar trazabilidad
                                            contable). Solo permitimos cambiar
                                            entre centros existentes, no
                                            quitarlo. clearable=false. */}
                                        {/* QA Bloque AU+ (2026-05-07): centro de
                                            costo NO debe modificarse al editar la
                                            cuenta bancaria (rompe trazabilidad
                                            contable de los movimientos historicos).
                                            Mostrar como solo-lectura. */}
                                        <InputSelectModal
                                            id="upd_costCenterId" label="Centro de costo"
                                            value={record.costCenterId}
                                            onChange={() => {}}
                                            options={costCenters}
                                            required
                                            disabled
                                        />
                                    </div>
                                </div>

                                {/* ── Sucursal ────────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-map-pin-line me-1"></i>Sucursal y contacto
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-4">
                                        <InputSelectModal
                                            id="upd_bankBranchId" label="Sucursal"
                                            value={record?.bankBranch?.id ?? ''}
                                            onChange={v => {
                                                field('bankBranchId', v);
                                            }}
                                            options={branches}
                                            error={errors.bankBranchId}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        <InputModal
                                            type="text" id="upd_accountExecutive" label="Ejecutivo de cuenta"
                                            placeholder="Ej: María Gómez P."
                                            value={record.accountExecutive}
                                            maxLength={100}
                                            onChange={e => field('accountExecutive', e.target.value)}
                                            error={errors.accountExecutive}
                                        />
                                    </div>
                                    {/* <div className="col-md-4 mb-4">
                                        <InputModal
                                            type="text" id="upd_bankPhone" label="Teléfono banco"
                                            placeholder="Ej: 6016543210"
                                            value={record.bankPhone}
                                            onChange={e => field('bankPhone', e.target.value)}
                                            error={errors.bankPhone}
                                        />
                                    </div> */}
                                </div>

                                <div className="row mb-4">
                                    <div className="col-md-12 mb-4">
                                        <InputModal
                                            type="text" id="upd_description" label="Descripción"
                                            placeholder="Descripción de la cuenta"
                                            value={record.description}
                                            maxLength={500}
                                            onChange={e => field('description', e.target.value)}
                                            error={errors.description}
                                        />
                                    </div>
                                </div>

                                {/* ── Configuraciones ─────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-toggle-line me-1"></i>Configuraciones
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-4 mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input className="form-check-input" type="checkbox"
                                                id="upd_allowsOverdraft"
                                                checked={!!record.allowsOverdraft}
                                                onChange={e => field('allowsOverdraft', e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="upd_allowsOverdraft">
                                                Permite sobregiro
                                            </label>
                                        </div>
                                        {record.allowsOverdraft && (
                                            <InputModal
                                                type="number" id="upd_creditLimit" label="Límite de crédito"
                                                value={record.creditLimit ?? 0}
                                                onChange={e => field('creditLimit', Number(e.target.value))}
                                                error={errors.creditLimit} min={0}
                                            />
                                        )}
                                    </div>
                                    <div className="col-md-4 mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input className="form-check-input" type="checkbox"
                                                id="upd_notifyLowBalance"
                                                checked={!!record.notifyLowBalance}
                                                onChange={e => field('notifyLowBalance', e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="upd_notifyLowBalance">
                                                Notificar saldo mínimo
                                            </label>
                                        </div>
                                        {record.notifyLowBalance && (
                                            <InputModal
                                                type="number" id="upd_minimumBalance" label="Saldo mínimo"
                                                value={record.minimumBalance ?? 0}
                                                onChange={e => field('minimumBalance', Number(e.target.value))}
                                                error={errors.minimumBalance} min={0}
                                            />
                                        )}
                                    </div>

                                    {/* QA Bloque AU (2026-05-06) — Bug 2: switch
                                        para activar/desactivar manejo de chequera
                                        con reglas. ACTIVAR es libre. DESACTIVAR
                                        valida en backend que no existan cheques
                                        EMITIDOS o no conciliados; si los hay,
                                        muestra mensaje y revierte el toggle. */}
                                    <div className="col-md-4 mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input className="form-check-input" type="checkbox"
                                                id="upd_handlesCheckbook"
                                                checked={!!record.handlesCheckbook}
                                                onChange={async (e) => {
                                                    const next = e.target.checked;
                                                    const motivo = next
                                                        ? 'Activacion manejo de chequera desde edicion'
                                                        : 'Desactivacion manejo de chequera desde edicion';
                                                    try {
                                                        await fetchHelper.post(
                                                            base_url(['api', 'v1', 'bank-accounts', record.id, 'toggle-checkbook']),
                                                            { enable: next, motivo },
                                                            {}, 1000
                                                        );
                                                        field('handlesCheckbook', next);
                                                        setError({ message: '', type: '', show: false });
                                                    } catch (err) {
                                                        setError({
                                                            message: err?.msg || 'No se pudo cambiar el manejo de chequera.',
                                                            type: 'danger',
                                                            show: true,
                                                        });
                                                        // Revertir UI
                                                        e.target.checked = !next;
                                                    }
                                                }}
                                            />
                                            <label className="form-check-label" htmlFor="upd_handlesCheckbook">
                                                Maneja chequera
                                            </label>
                                        </div>
                                        <small className="text-muted">
                                            Activar es libre. Desactivar requiere que no existan cheques EMITIDOS o no conciliados.
                                        </small>
                                    </div>
                                </div>

                                {/* ── Auditoría ───────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-clipboard-line me-1"></i>Auditoría
                                </p>
                                <div className="row">
                                    <div className="col-md-12 mb-4">
                                        {/* QA BNK (2026-06-03 / doc validaciones BNK-RF-02): motivo del cambio entre 5 y 300 caracteres. */}
                                        <InputModal
                                            type="text" id="upd_changeReason" label="Motivo del cambio"
                                            placeholder="Describa brevemente el motivo de la modificación (entre 5 y 300 caracteres)"
                                            value={record.changeReason}
                                            maxLength={300}
                                            onChange={e => field('changeReason', e.target.value)}
                                            error={errors.changeReason} required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* QA Bloque AU+ (2026-05-07): vincular terceros desde
                            esta vista esta DESHABILITADO. La operacion de
                            vincular/desvincular se hace exclusivamente desde el
                            modulo Terceros (modal del tercero, tab "Cuentas
                            Bancarias"). Aqui solo mostramos los terceros que ya
                            estan vinculados en modo lectura para que el usuario
                            confirme los titulares de la cuenta. */}
                        <hr className="my-4" />
                        <h6 className="mb-3">
                            <i className="ri-user-shared-line me-2"></i>Terceros vinculados a esta cuenta
                        </h6>
                        <p className="text-muted small mb-3">
                            Solo lectura. Para vincular o desvincular un tercero, use el modulo
                            <em> Terceros &rarr; Editar tercero &rarr; pestaña "Cuentas Bancarias"</em>.
                        </p>

                        {linksLoading && (
                            <p className="text-muted text-center py-2">Cargando...</p>
                        )}
                        {!linksLoading && linkedThirdParties.length === 0 && (
                            <p className="text-muted text-center py-2">
                                Esta cuenta no tiene terceros vinculados.
                            </p>
                        )}
                        {!linksLoading && linkedThirdParties.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>NIT</th>
                                            <th>Razon Social</th>
                                            <th>Principal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkedThirdParties.map(link => (
                                            <tr key={`bd_${link.id}`}>
                                                <td>{link.thirdPartyNit ?? '-'}</td>
                                                <td>{link.thirdPartyBusinessName ?? '-'}</td>
                                                <td>
                                                    {link.isPrimary
                                                        ? <span className="badge bg-label-primary">Si</span>
                                                        : <span className="badge bg-label-secondary">No</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={loadingDetail}>
                            <i className="ri-save-line me-1"></i>Guardar cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateBankAccount;
