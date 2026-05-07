import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_UPDATE        = (id) => ['api', 'v1', 'cash', 'update', id];
const API_UPDATE_STATUS = (id) => ['api', 'v1', 'cash', id, 'status'];

const TIPOS_CAJA = [
    { id: 'GENERAL',    label: 'General' },
    { id: 'PETTY_CASH', label: 'Caja Menor' },
    { id: 'FIXED_FUND', label: 'Fondo Fijo' },
];

const ESTADOS_CAJA = [
    { id: 'ACTIVE',   label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
    { id: 'CLOSED',   label: 'Cerrada' },
];

const PERIODICIDAD_ARQUEO = [
    { id: 'DAILY',   label: 'Diario' },
    { id: 'WEEKLY',  label: 'Semanal' },
    { id: 'MONTHLY', label: 'Mensual' },
];

const LIBROS_CONTABLES = [
    { id: 'LOCAL', label: 'Local' },
    { id: 'IFRS',  label: 'NIIF (IFRS)' },
    { id: 'TAX',   label: 'Fiscal (TAX)' },
];

const TABS = [
    { id: 'identificacion', label: 'Identificación',           icon: 'ri-id-card-line' },
    { id: 'ubicacion',      label: 'Ubicación y Responsables', icon: 'ri-map-pin-line' },
    { id: 'financiero',     label: 'Datos Financieros',        icon: 'ri-money-dollar-circle-line' },
    { id: 'limites',        label: 'Límites y Alertas',        icon: 'ri-alarm-warning-line' },
    { id: 'operaciones',    label: 'Operaciones',              icon: 'ri-settings-3-line' },
    { id: 'contabilidad',   label: 'Contabilidad',             icon: 'ri-book-2-line' },
];

// QA Bloque AU (2026-05-06) — Bug 2 + Bug 3: campo → tab + restriccion de
// edicion. Codigo, tipo y moneda NO son editables tras la creacion (HU
// preservacion contable). Si el usuario intenta cambiarlos, el frontend
// los muestra como readonly.
const FIELD_TO_TAB = {
    codigoCaja: 'identificacion', nombreCaja: 'identificacion', tipoCaja: 'identificacion', descripcion: 'identificacion',
    ubicacionFisica: 'ubicacion', idResponsablePrincipal: 'ubicacion', idResponsableSuplente: 'ubicacion', horarioOperacion: 'ubicacion',
    monedaCodigo: 'financiero', saldoInicial: 'financiero', fechaSaldoInicial: 'financiero', fechaCreacionCaja: 'financiero',
    limiteMaximo: 'limites', limiteMinimo: 'limites', notificarLimite: 'limites',
    requiereAutorizacion: 'operaciones', montoMaxSinAutorizacion: 'operaciones', periodicidadArqueo: 'operaciones',
    idCuentaContable: 'contabilidad', libroContable: 'contabilidad', centroCosto: 'contabilidad',
    motivoCambio: 'identificacion', statusReason: 'identificacion', closingDate: 'identificacion',
};

export default function UpdatedCaja({ modalRef, modalInstance, caja, setCaja, dataTableRef, setCajaEdit, readOnly,
    accountingAccounts, currencyTypes, costCenters, users
 }) {
    const [cajaUpdated, setCajaUpdated]       = useState(caja);
    const [errors, setErrors]                 = useState({});
    const [errorMessage, setErrorMessage]     = useState('');
    const [activeTab, setActiveTab]           = useState('identificacion');

    useEffect(() => {
        setCajaUpdated({ ...caja, statusReason: '', closingDate: '' });
        setErrors({});
        setErrorMessage('');
        setActiveTab('identificacion');
    }, [caja]);

    const set = (field, value) => setCajaUpdated(prev => ({ ...prev, [field]: value }));

    const statusChanged = cajaUpdated.estadoCaja !== caja.estadoCaja;

    const validate = () => {
        const e = {};
        if (!cajaUpdated.codigoCaja?.trim())      e.codigoCaja             = 'Campo requerido';
        if (!cajaUpdated.nombreCaja?.trim())      e.nombreCaja             = 'Campo requerido';
        if (!cajaUpdated.tipoCaja)                e.tipoCaja               = 'Campo requerido';
        if (!cajaUpdated.ubicacionFisica?.trim()) e.ubicacionFisica        = 'Campo requerido';
        if (!cajaUpdated.idResponsablePrincipal)  e.idResponsablePrincipal = 'Campo requerido';
        if (!cajaUpdated.monedaCodigo)            e.monedaCodigo           = 'Campo requerido';
        if (cajaUpdated.saldoInicial === '')      e.saldoInicial           = 'Campo requerido';
        if (!cajaUpdated.fechaSaldoInicial)       e.fechaSaldoInicial      = 'Campo requerido';
        if (!cajaUpdated.fechaCreacionCaja)       e.fechaCreacionCaja      = 'Campo requerido';
        if (!cajaUpdated.periodicidadArqueo)      e.periodicidadArqueo     = 'Campo requerido';
        if (!cajaUpdated.idCuentaContable)        e.idCuentaContable       = 'Campo requerido';
        if (!cajaUpdated.libroContable)           e.libroContable          = 'Campo requerido';
        if (cajaUpdated.limiteMaximo !== '' && Number(cajaUpdated.limiteMaximo) <= 0) e.limiteMaximo = 'Debe ser > 0';
        if (cajaUpdated.limiteMinimo !== '' && Number(cajaUpdated.limiteMinimo) < 0)  e.limiteMinimo = 'Debe ser ≥ 0';
        if (cajaUpdated.limiteMaximo !== '' && cajaUpdated.limiteMinimo !== '' &&
            Number(cajaUpdated.limiteMaximo) <= Number(cajaUpdated.limiteMinimo)) e.limiteMaximo = 'Debe ser mayor que el límite mínimo';
        if (cajaUpdated.requiereAutorizacion && cajaUpdated.montoMaxSinAutorizacion === '')
            e.montoMaxSinAutorizacion = 'Requerido cuando se activa autorización';
        // Validaciones BNK-RF-12: cambio de estado
        if (statusChanged && (cajaUpdated.estadoCaja === 'INACTIVE' || cajaUpdated.estadoCaja === 'CLOSED')) {
            if (!cajaUpdated.statusReason?.trim() || cajaUpdated.statusReason.trim().length < 10)
                e.statusReason = 'Motivo requerido (mínimo 10 caracteres)';
        }
        if (statusChanged && cajaUpdated.estadoCaja === 'CLOSED') {
            if (!cajaUpdated.closingDate) e.closingDate = 'Fecha de cierre requerida para CLOSED';
        }
        // QA Bloque AU+ (2026-05-07) Bug 4: motivo del cambio AHORA es obligatorio
        // al editar cualquier cosa de la caja (trazabilidad por exigencia de la HU).
        // Antes era opcional y solo se validaba si el usuario llenaba algo.
        if (!cajaUpdated.motivoCambio || cajaUpdated.motivoCambio.trim().length < 10) {
            e.motivoCambio = `El motivo del cambio es obligatorio y debe tener mínimo 10 caracteres (actual: ${(cajaUpdated.motivoCambio || '').trim().length}).`;
        }
        // QA Bloque AU (2026-05-06) — Bug 1: principal y suplente no pueden ser iguales.
        if (cajaUpdated.idResponsablePrincipal && cajaUpdated.idResponsableSuplente
            && String(cajaUpdated.idResponsablePrincipal) === String(cajaUpdated.idResponsableSuplente)) {
            e.idResponsableSuplente = 'El suplente debe ser una persona distinta del responsable principal.';
        }
        return e;
    };

    // QA Bloque AU (2026-05-06) — Bug 2: marca de tabs con errores.
    const tabsWithErrors = Object.keys(errors).reduce((acc, key) => {
        const tab = FIELD_TO_TAB[key];
        if (tab) acc.add(tab);
        return acc;
    }, new Set());

    const handleUpdate = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) {
            setErrors(e);
            const firstErrTab = TABS.find(t => Object.keys(e).some(k => FIELD_TO_TAB[k] === t.id));
            if (firstErrTab) setActiveTab(firstErrTab.id);
            const list = Object.entries(e).map(([k, v]) => `• ${k}: ${v}`).join('\n');
            setErrorMessage('Por favor corrija los errores antes de continuar:\n' + list);
            return;
        }
        setErrors({});
        setErrorMessage('');

        const payload = {
            cashCode:                    cajaUpdated.codigoCaja,
            cashName:                    cajaUpdated.nombreCaja,
            cashType:                    cajaUpdated.tipoCaja,
            description:                 cajaUpdated.descripcion || null,
            physicalLocation:            cajaUpdated.ubicacionFisica,
            principalResponsibleId:      Number(cajaUpdated.idResponsablePrincipal),
            alternateResponsibleId:      cajaUpdated.idResponsableSuplente ? Number(cajaUpdated.idResponsableSuplente) : null,
            operationSchedule:           cajaUpdated.horarioOperacion || null,
            currencyId:                  Number(cajaUpdated.monedaCodigo),
            initialBalanace:             Number(cajaUpdated.saldoInicial),   // typo intencional del backend
            initialBalanceDay:           cajaUpdated.fechaSaldoInicial,
            cashCreationDate:            cajaUpdated.fechaCreacionCaja,
            maxLimit:                    cajaUpdated.limiteMaximo !== '' ? Number(cajaUpdated.limiteMaximo) : null,
            minLimit:                    cajaUpdated.limiteMinimo !== '' ? Number(cajaUpdated.limiteMinimo) : null,
            requiresAuthorization:       cajaUpdated.requiereAutorizacion,
            maxAmountWithoutAuthorization: cajaUpdated.montoMaxSinAutorizacion !== '' ? Number(cajaUpdated.montoMaxSinAutorizacion) : null,
            notifyLimit:                 cajaUpdated.notificarLimite !== '' ? Number(cajaUpdated.notificarLimite) : null,
            auditFrequency:              cajaUpdated.periodicidadArqueo,
            accountingAccountId:         Number(cajaUpdated.idCuentaContable),
            costCenterId:                cajaUpdated.centroCosto !== '' ? Number(cajaUpdated.centroCosto) : null,
            accountingBook:              cajaUpdated.libroContable,
            changeReason:                cajaUpdated.motivoCambio || null,
        };

        try {
            await fetchHelper.put(base_url(API_UPDATE(cajaUpdated.id)), payload, {}, 1000, true);

            // Si el estado cambió, llamar al endpoint de cambio de estado (BNK-RF-12)
            if (statusChanged) {
                const statusPayload = {
                    status:      cajaUpdated.estadoCaja,
                    reason:      cajaUpdated.statusReason || null,
                    closingDate: cajaUpdated.closingDate  || null,
                };
                await fetchHelper.put(base_url(API_UPDATE_STATUS(cajaUpdated.id)), statusPayload, {}, 1000, true);
            }

            modalInstance?.current?.hide();
            setCajaEdit(true);
            dataTableRef?.current?.ajax?.reload?.();
        } catch (err) {
            setErrorMessage(err?.msg || 'Error al actualizar la caja.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className={`${readOnly ? 'ri-eye-line' : 'ri-edit-line'} me-2`} />
                            {readOnly ? 'Ver Caja' : 'Editar Caja'}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {/* QA Bloque AU (2026-05-06) — Bug 3: aviso de campos
                            no editables tras la creacion (HU preservacion). */}
                        {!readOnly && (
                            <div className="alert alert-info py-2 mb-3">
                                <i className="ri-information-line me-1"></i>
                                El <strong>código</strong>, el <strong>tipo de caja</strong> y la <strong>moneda</strong> no pueden modificarse después de la creación.
                            </div>
                        )}
                        {errorMessage && !readOnly && (
                            <div className="alert alert-danger py-2 mb-3" style={{whiteSpace: 'pre-line'}}>
                                {errorMessage}
                            </div>
                        )}

                        <ul className="nav nav-tabs mb-3 flex-wrap">
                            {TABS.map(t => {
                                const hasError = tabsWithErrors.has(t.id);
                                return (
                                    <li className="nav-item" key={t.id}>
                                        <button
                                            className={`nav-link ${activeTab === t.id ? 'active' : ''} ${hasError ? 'text-danger' : ''}`}
                                            onClick={() => setActiveTab(t.id)}
                                            style={hasError ? { borderColor: '#ff5b5c' } : undefined}
                                            title={hasError ? 'Esta pestaña tiene campos con errores' : undefined}
                                        >
                                            <i className={`${t.icon} me-1`} />
                                            {t.label}
                                            {hasError && <i className="ri-error-warning-line text-danger ms-1" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Identificación */}
                        {activeTab === 'identificacion' && (
                            <div className="row">
                                {/* QA Bloque AU (2026-05-06) — Bug 3: codigo,
                                    tipo y moneda son readonly tras creacion. */}
                                <div className="col-md-3 mb-3">
                                    <InputModal id="cu_codigo" label="Código de Caja" value={cajaUpdated.codigoCaja}
                                        onChange={e => set('codigoCaja', e.target.value)} error={errors.codigoCaja}
                                        required={true} disabled readOnly />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputModal id="cu_nombre" label="Nombre de Caja" value={cajaUpdated.nombreCaja}
                                        onChange={e => set('nombreCaja', e.target.value)} error={errors.nombreCaja}
                                        required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputSelectModal id="cu_tipo" label="Tipo de Caja" value={cajaUpdated.tipoCaja}
                                        onChange={v => set('tipoCaja', v)} error={errors.tipoCaja}
                                        options={TIPOS_CAJA} placeholder="Seleccione tipo" required={true} disabled />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputSelectModal id="cu_estado" label="Estado" value={cajaUpdated.estadoCaja}
                                        onChange={v => set('estadoCaja', v)} error={errors.estadoCaja}
                                        options={ESTADOS_CAJA} placeholder="Seleccione estado" disabled={readOnly} />
                                </div>
                                {!readOnly && statusChanged && (cajaUpdated.estadoCaja === 'INACTIVE' || cajaUpdated.estadoCaja === 'CLOSED') && (
                                    <div className="col-md-12 mb-3">
                                        <TextareaModal id="cu_status_reason" label="Motivo del cambio de estado"
                                            value={cajaUpdated.statusReason}
                                            onChange={e => set('statusReason', e.target.value)} error={errors.statusReason}
                                            placeholder="Mínimo 10 caracteres" required={true} />
                                    </div>
                                )}
                                {!readOnly && statusChanged && cajaUpdated.estadoCaja === 'CLOSED' && (
                                    <div className="col-md-4 mb-3">
                                        <InputModal id="cu_closing_date" label="Fecha de Cierre" type="date"
                                            value={cajaUpdated.closingDate}
                                            onChange={e => set('closingDate', e.target.value)} error={errors.closingDate} required={true} />
                                    </div>
                                )}
                                <div className="col-md-12 mb-3">
                                    <TextareaModal id="cu_desc" label="Descripción" value={cajaUpdated.descripcion}
                                        onChange={e => set('descripcion', e.target.value)} error={errors.descripcion}
                                        placeholder="Descripción adicional o notas" disabled={readOnly} />
                                </div>
                            </div>
                        )}

                        {/* Ubicación y Responsables */}
                        {activeTab === 'ubicacion' && (
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cu_ubicacion" label="Ubicación Física" value={cajaUpdated.ubicacionFisica}
                                        onChange={e => set('ubicacionFisica', e.target.value)} error={errors.ubicacionFisica}
                                        required={true} disabled={readOnly} />
                                </div>
                                {/* QA Bloque AU (2026-05-06) — Bug 5: dos
                                    inputs type=time concatenados como
                                    "HH:MM-HH:MM" en operationSchedule. */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Horario de Operación</label>
                                    <div className="d-flex align-items-center">
                                        <input
                                            type="time"
                                            className="form-control me-2"
                                            value={(cajaUpdated.horarioOperacion || '').split('-')[0] || ''}
                                            onChange={e => {
                                                const start = e.target.value;
                                                const end = (cajaUpdated.horarioOperacion || '').split('-')[1] || '';
                                                set('horarioOperacion', start || end ? `${start}-${end}` : '');
                                            }}
                                            disabled={readOnly}
                                            aria-label="Hora de inicio"
                                        />
                                        <span className="mx-1">a</span>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={(cajaUpdated.horarioOperacion || '').split('-')[1] || ''}
                                            onChange={e => {
                                                const start = (cajaUpdated.horarioOperacion || '').split('-')[0] || '';
                                                const end = e.target.value;
                                                set('horarioOperacion', start || end ? `${start}-${end}` : '');
                                            }}
                                            disabled={readOnly}
                                            aria-label="Hora de cierre"
                                        />
                                    </div>
                                    {errors.horarioOperacion && (
                                        <div className="text-danger small">{errors.horarioOperacion}</div>
                                    )}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputSelectModal id="cu_resp_p" label="Responsable Principal" value={cajaUpdated.idResponsablePrincipal}
                                        onChange={v => set('idResponsablePrincipal', v)} error={errors.idResponsablePrincipal}
                                        options={users} placeholder="Seleccione responsable principal" required={true} />
                                    {/* <InputModal id="cu_resp_p" label="ID Responsable Principal" type="number"
                                        value={cajaUpdated.idResponsablePrincipal}
                                        onChange={e => set('idResponsablePrincipal', e.target.value)}
                                        error={errors.idResponsablePrincipal} required={true} disabled={readOnly} /> */}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputSelectModal id="cu_resp_s" label="Responsable Suplente" value={cajaUpdated.idResponsableSuplente}
                                        onChange={v => set('idResponsableSuplente', v)} error={errors.idResponsableSuplente}
                                        options={users} placeholder="Seleccione responsable suplente" placeholder="Opcional" />
                                    {/* <InputModal id="cu_resp_s" label="ID Responsable Suplente" type="number"
                                        value={cajaUpdated.idResponsableSuplente}
                                        onChange={e => set('idResponsableSuplente', e.target.value)}
                                        error={errors.idResponsableSuplente} placeholder="Opcional" disabled={readOnly} /> */}
                                </div>
                            </div>
                        )}

                        {/* Datos Financieros */}
                        {activeTab === 'financiero' && (
                            <div className="row">
                                {/* QA Bloque AU (2026-05-06) — Bug 3: moneda
                                    no editable tras la creacion. */}
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_moneda" label="Moneda" value={cajaUpdated.monedaCodigo}
                                        onChange={v => set('monedaCodigo', v)} error={errors.monedaCodigo}
                                        options={currencyTypes} placeholder="Seleccione moneda" required={true}
                                        disabled />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_saldo" label="Saldo Inicial" type="number"
                                        value={cajaUpdated.saldoInicial}
                                        onChange={e => set('saldoInicial', e.target.value)} error={errors.saldoInicial}
                                        required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_fecha_saldo" label="Fecha Saldo Inicial" type="date"
                                        value={cajaUpdated.fechaSaldoInicial}
                                        onChange={e => set('fechaSaldoInicial', e.target.value)} error={errors.fechaSaldoInicial}
                                        required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_fecha_caja" label="Fecha Creación Caja" type="date"
                                        value={cajaUpdated.fechaCreacionCaja}
                                        onChange={e => set('fechaCreacionCaja', e.target.value)} error={errors.fechaCreacionCaja}
                                        required={true} disabled={readOnly} />
                                </div>
                            </div>
                        )}

                        {/* Límites y Alertas */}
                        {activeTab === 'limites' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_lim_max" label="Límite Máximo" type="number"
                                        value={cajaUpdated.limiteMaximo}
                                        onChange={e => set('limiteMaximo', e.target.value)} error={errors.limiteMaximo}
                                        placeholder="Opcional" disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_lim_min" label="Límite Mínimo" type="number"
                                        value={cajaUpdated.limiteMinimo}
                                        onChange={e => set('limiteMinimo', e.target.value)} error={errors.limiteMinimo}
                                        placeholder="Opcional" disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_notificar" label="Notificar al Límite" type="number"
                                        value={cajaUpdated.notificarLimite}
                                        onChange={e => set('notificarLimite', e.target.value)} error={errors.notificarLimite}
                                        placeholder="Opcional" disabled={readOnly} />
                                </div>
                                <div className="col-12 mb-3">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" role="switch" id="cu_req_auth"
                                            checked={cajaUpdated.requiereAutorizacion}
                                            onChange={e => !readOnly && set('requiereAutorizacion', e.target.checked)}
                                            disabled={readOnly} />
                                        <label className="form-check-label" htmlFor="cu_req_auth">
                                            Requiere autorización para movimientos
                                        </label>
                                    </div>
                                </div>
                                {cajaUpdated.requiereAutorizacion && (
                                    <div className="col-md-4 mb-3">
                                        <InputModal id="cu_monto_auth" label="Monto Máximo sin Autorización" type="number"
                                            value={cajaUpdated.montoMaxSinAutorizacion}
                                            onChange={e => set('montoMaxSinAutorizacion', e.target.value)}
                                            error={errors.montoMaxSinAutorizacion} required={!readOnly} disabled={readOnly} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Operaciones */}
                        {activeTab === 'operaciones' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_periodicidad" label="Periodicidad de Arqueo"
                                        value={cajaUpdated.periodicidadArqueo}
                                        onChange={v => set('periodicidadArqueo', v)} error={errors.periodicidadArqueo}
                                        options={PERIODICIDAD_ARQUEO} placeholder="Seleccione periodicidad"
                                        required={!readOnly} disabled={readOnly} />
                                </div>
                            </div>
                        )}

                        {/* Contabilidad */}
                        {activeTab === 'contabilidad' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_cuenta" label="Cuenta Contable" value={cajaUpdated.idCuentaContable}
                                        onChange={v => set('idCuentaContable', v)} error={errors.idCuentaContable}
                                        options={accountingAccounts.map(aa => {
                                            return {
                                                id: aa.id,
                                                label: aa.pucAccount.code + ' - ' + aa.customName
                                            }
                                        })} placeholder="Seleccione cuenta contable" required={true} />
                                    {/* <InputModal id="cu_cuenta" label="ID Cuenta Contable" type="number"
                                        value={cajaUpdated.idCuentaContable}
                                        onChange={e => set('idCuentaContable', e.target.value)} error={errors.idCuentaContable}
                                        required={!readOnly} disabled={readOnly} /> */}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_centro" label="Centro de Costo" value={cajaUpdated.centroCosto}
                                        onChange={v => set('centroCosto', v)} error={errors.centroCosto}
                                        options={costCenters} placeholder="Seleccione centro de costo" placeholder="Opcional" />
                                    {/* <InputModal id="cu_centro" label="ID Centro de Costo" type="number" value={cajaUpdated.centroCosto}
                                        onChange={e => set('centroCosto', e.target.value)} error={errors.centroCosto}
                                        placeholder="Opcional" disabled={readOnly} /> */}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_libro" label="Libro Contable" value={cajaUpdated.libroContable}
                                        onChange={v => set('libroContable', v)} error={errors.libroContable}
                                        options={LIBROS_CONTABLES} placeholder="Seleccione libro"
                                        required={!readOnly} disabled={readOnly} />
                                </div>
                                {/* Campo motivo movido al footer global del modal
                                    para que sea visible siempre (en cualquier tab). */}
                            </div>
                        )}
                    </div>
                    {/* QA Bloque AU+ (2026-05-07) Bug 4: Motivo del cambio
                         OBLIGATORIO siempre visible al editar (cualquier tab). */}
                    {!readOnly && (
                        <div className="px-4 pt-2 pb-0 border-top">
                            <TextareaModal id="cu_motivo_global" label="Motivo del Cambio (obligatorio)"
                                value={cajaUpdated.motivoCambio}
                                onChange={e => set('motivoCambio', e.target.value)}
                                error={errors.motivoCambio}
                                placeholder="Obligatorio para cualquier edicion (minimo 10 caracteres)"
                                required />
                        </div>
                    )}
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            {readOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!readOnly && (
                            <button type="button" className="btn btn-primary" onClick={handleUpdate}>
                                <i className="ri-save-line me-1" />Guardar Cambios
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
