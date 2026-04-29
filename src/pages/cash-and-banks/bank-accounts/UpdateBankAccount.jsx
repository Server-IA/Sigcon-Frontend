import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

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
    const handleSave = async () => {
        try {
            const body = {
                code:             record.code,
                accountNumber:    record.accountNumber,
                accountNumberMasked: record.accountNumberMasked,
                bankId:           record.bankId,
                currencyTypeId:   record.currencyTypeId,
                accountName:      record.accountName,
                branchName:       record.branchName       || '',
                bankBranchId:     Number(record.bankBranchId)     || 0,
                accountExecutive: record.accountExecutive || '',
                bankPhone:        record.bankPhone        || '',
                description:      record.description      || '',
                allowsOverdraft:  record.allowsOverdraft  || false,
                creditLimit:      Number(record.creditLimit)    || 0,
                notifyLowBalance: record.notifyLowBalance  || false,
                minimumBalance:   Number(record.minimumBalance) || 0,
                costCenterId:     Number(record.costCenterId)   || 0,
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
                                {/* ── Campos de solo lectura ──────────────── */}
                                {record.used && (
                                    <div className="alert alert-info py-2 mb-4">
                                        <i className="ri-information-line me-1"></i>
                                        El código, número de cuenta, moneda y cuenta contable <strong>no pueden modificarse</strong> si existen movimientos registrados.
                                    </div>
                                )}

                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-file-list-3-line me-1"></i>Información de referencia
                                </p>
                                <div className="row mb-4">
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_code" label="Código"
                                            value={record.code} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputModal type="text" id="upd_code" label="Código"
                                                value={record.code} onChange={e => field('code', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_accountNumberMasked" label="N° Cuenta"
                                            value={record.accountNumberMasked} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputModal type="text" id="upd_accountNumberMasked" label="N° Cuenta"
                                                value={record.accountNumberMasked} onChange={e => field('accountNumberMasked', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_bankName" label="Banco"
                                            value={record.bankName} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputSelectModal
                                                id="upd_bankId" label="Banco"
                                                value={record?.bank?.id ?? ''}
                                                onChange={v => field('bankId', v)}
                                                options={banks.map(b => ({ id: b.id, label: b.name || b.label }))}
                                                error={errors.bankId}
                                                required={true}

                                            />
                                            // <InputModal type="text" id="upd_bankName" label="Banco"
                                            //     value={record.bankName} onChange={e => field('bankName', e.target.value)} />
                                        )}
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        {record.used && (
                                        <InputModal type="text" id="upd_currencyCode" label="Moneda"
                                            value={record.currencyCode} readOnly disabled />
                                        )}
                                        {!record.used && (
                                            <InputSelectModal
                                                id="upd_currencyTypeId" label="Moneda"
                                                value={record?.currency?.id ?? ''}
                                                onChange={v => field('currencyTypeId', v)}
                                                options={currencyTypes.map(c => ({ id: c.id, label: c.name || c.label }))}
                                                error={errors.currencyTypeId}
                                                required={true}
                                            />
                                        )}
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
                                            onChange={e => field('accountName', e.target.value)}
                                            error={errors.accountName} required
                                        />
                                    </div>
                                    <div className="col-md-6 mb-4">
                                        <InputSelectModal
                                            id="upd_costCenterId" label="Centro de costo"
                                            value={record.costCenterId}
                                            onChange={v => field('costCenterId', v)}
                                            options={costCenters}
                                            clearable
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
                                            placeholder="Nombre del ejecutivo"
                                            value={record.accountExecutive}
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
                                </div>

                                {/* ── Auditoría ───────────────────────────── */}
                                <p className="text-muted fw-semibold mb-3 border-bottom pb-1">
                                    <i className="ri-clipboard-line me-1"></i>Auditoría
                                </p>
                                <div className="row">
                                    <div className="col-md-12 mb-4">
                                        <InputModal
                                            type="text" id="upd_changeReason" label="Motivo del cambio"
                                            placeholder="Describa brevemente el motivo de la modificación (mínimo 10 caracteres)"
                                            value={record.changeReason}
                                            onChange={e => field('changeReason', e.target.value)}
                                            error={errors.changeReason} required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* HU-TER-05 (2026-04-27): Terceros vinculados a esta cuenta bancaria.
                            Mismo modelo que el tab 'Cuentas Bancarias' del modal Tercero,
                            pero invertido: aqui el contador asigna terceros al abrir la cuenta. */}
                        <hr className="my-4" />
                        <h6 className="mb-3">
                            <i className="ri-user-shared-line me-2"></i>Terceros vinculados a esta cuenta
                        </h6>
                        <p className="text-muted small mb-3">
                            Permite asignar el titular o terceros autorizados de la cuenta. Los cambios
                            se reflejan automaticamente en el modulo de Terceros.
                        </p>

                        <div className="row align-items-end mb-3">
                            <div className="col-md-9">
                                <InputSelectModal
                                    id="upd_link_third_party"
                                    label="Tercero"
                                    value={selectedThirdPartyId}
                                    onChange={(v) => setSelectedThirdPartyId(v)}
                                    options={thirdPartyOptions.filter(o => {
                                        // Excluir el ya vinculado activo (no en pending unlink)
                                        const linkedActive = linkedThirdParties.some(l =>
                                            l.thirdPartyId === o.id && !pendingTpUnlinks.includes(l.id));
                                        return !linkedActive;
                                    })}
                                    placeholder="Seleccione un tercero"
                                    emptyMessage={thirdPartyOptions.length === 0
                                        ? 'No hay terceros registrados. Cree uno en el modulo Terceros.'
                                        : 'No hay terceros disponibles para vincular.'}
                                />
                            </div>
                            <div className="col-md-3">
                                <button
                                    type="button"
                                    className="btn btn-primary w-100"
                                    onClick={handleLinkThirdParty}
                                    disabled={!selectedThirdPartyId
                                        || (linkedThirdParties.filter(l => !pendingTpUnlinks.includes(l.id)).length > 0)
                                        || pendingTpLinks.length > 0}
                                    title={(linkedThirdParties.filter(l => !pendingTpUnlinks.includes(l.id)).length > 0
                                        || pendingTpLinks.length > 0)
                                        ? 'Solo se puede vincular un tercero por cuenta'
                                        : 'Vincular tercero'}
                                >
                                    <i className="ri-link me-1"></i>Vincular
                                </button>
                            </div>
                        </div>

                        {(pendingTpLinks.length > 0 || pendingTpUnlinks.length > 0) && (
                            <div className="alert alert-warning py-2 mb-3" role="alert">
                                <i className="ri-information-line me-1"></i>
                                Hay cambios pendientes en terceros vinculados.
                                Se aplicaran al hacer click en <strong>Guardar Cambios</strong>.
                                Si cierra sin guardar, se descartaran.
                            </div>
                        )}

                        {linksLoading && (
                            <p className="text-muted text-center py-2">Cargando...</p>
                        )}
                        {(() => {
                            const visibleLinked = linkedThirdParties.filter(l => !pendingTpUnlinks.includes(l.id));
                            const totalRows = visibleLinked.length + pendingTpLinks.length;
                            if (linksLoading) return null;
                            if (totalRows === 0) {
                                return (
                                    <p className="text-muted text-center py-2">
                                        Esta cuenta no tiene terceros vinculados.
                                    </p>
                                );
                            }
                            return (
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered">
                                        <thead className="table-light">
                                            <tr>
                                                <th>NIT</th>
                                                <th>Razon Social</th>
                                                <th>Estado</th>
                                                <th style={{width:'80px'}}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleLinked.map(link => (
                                                <tr key={`bd_${link.id}`}>
                                                    <td>{link.thirdPartyNit ?? '-'}</td>
                                                    <td>{link.thirdPartyBusinessName ?? '-'}</td>
                                                    <td><span className="badge bg-label-success">Guardada</span></td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Desvincular (pendiente hasta Guardar)"
                                                            onClick={() => handleUnlinkThirdParty(link)}
                                                        >
                                                            <i className="ri-link-unlink"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {pendingTpLinks.map(pl => (
                                                <tr key={pl.tempId} className="table-warning">
                                                    <td colSpan={2}>{pl.label}</td>
                                                    <td><span className="badge bg-label-warning">Pendiente</span></td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            title="Quitar de pendientes"
                                                            onClick={() => handleUnlinkThirdParty(pl)}
                                                        >
                                                            <i className="ri-close-line"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
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
