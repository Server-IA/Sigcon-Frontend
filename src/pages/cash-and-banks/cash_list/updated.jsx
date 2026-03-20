import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_UPDATE = (id) => ['api', 'v1', 'cash', id];

const TIPOS_CAJA = [
    { id: 'GENERAL',    label: 'General' },
    { id: 'MENOR',      label: 'Menor' },
    { id: 'FONDO_FIJO', label: 'Fondo Fijo' },
];

const ESTADOS_CAJA = [
    { id: 'ACTIVA',   label: 'Activa' },
    { id: 'INACTIVA', label: 'Inactiva' },
    { id: 'CERRADA',  label: 'Cerrada' },
];

const PERIODICIDAD_ARQUEO = [
    { id: 'DIARIO',  label: 'Diario' },
    { id: 'SEMANAL', label: 'Semanal' },
    { id: 'MENSUAL', label: 'Mensual' },
];

const LIBROS_CONTABLES = [
    { id: 'LOCAL',  label: 'Local' },
    { id: 'NIIF',   label: 'NIIF' },
    { id: 'FISCAL', label: 'Fiscal' },
];

const TABS = [
    { id: 'identificacion', label: 'Identificación',           icon: 'ri-id-card-line' },
    { id: 'ubicacion',      label: 'Ubicación y Responsables', icon: 'ri-map-pin-line' },
    { id: 'financiero',     label: 'Datos Financieros',        icon: 'ri-money-dollar-circle-line' },
    { id: 'limites',        label: 'Límites y Alertas',        icon: 'ri-alarm-warning-line' },
    { id: 'operaciones',    label: 'Operaciones',              icon: 'ri-settings-3-line' },
    { id: 'contabilidad',   label: 'Contabilidad',             icon: 'ri-book-2-line' },
];

export default function UpdatedCaja({ modalRef, modalInstance, caja, setCaja, dataTableRef, setCajaEdit, readOnly }) {
    const [cajaUpdated, setCajaUpdated]       = useState(caja);
    const [errors, setErrors]                 = useState({});
    const [errorMessage, setErrorMessage]     = useState('');
    const [activeTab, setActiveTab]           = useState('identificacion');

    useEffect(() => {
        setCajaUpdated(caja);
        setErrors({});
        setErrorMessage('');
        setActiveTab('identificacion');
    }, [caja]);

    const set = (field, value) => setCajaUpdated(prev => ({ ...prev, [field]: value }));

    const validate = () => {
        const e = {};
        if (!cajaUpdated.codigoCaja?.trim())      e.codigoCaja             = 'Campo requerido';
        if (!cajaUpdated.nombreCaja?.trim())      e.nombreCaja             = 'Campo requerido';
        if (!cajaUpdated.tipoCaja)                e.tipoCaja               = 'Campo requerido';
        if (!cajaUpdated.ubicacionFisica?.trim()) e.ubicacionFisica        = 'Campo requerido';
        if (!cajaUpdated.idResponsablePrincipal)  e.idResponsablePrincipal = 'Campo requerido';
        if (!cajaUpdated.monedaCodigo?.trim())    e.monedaCodigo           = 'Campo requerido';
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
        return e;
    };

    const handleUpdate = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) {
            setErrors(e);
            setErrorMessage('Por favor corrija los errores antes de continuar.');
            return;
        }
        setErrors({});
        setErrorMessage('');

        const payload = {
            codigoCaja:              cajaUpdated.codigoCaja,
            nombreCaja:              cajaUpdated.nombreCaja,
            tipoCaja:                cajaUpdated.tipoCaja,
            estadoCaja:              cajaUpdated.estadoCaja,
            descripcion:             cajaUpdated.descripcion || null,
            ubicacionFisica:         cajaUpdated.ubicacionFisica,
            idResponsablePrincipal:  Number(cajaUpdated.idResponsablePrincipal),
            idResponsableSuplente:   cajaUpdated.idResponsableSuplente ? Number(cajaUpdated.idResponsableSuplente) : null,
            horarioOperacion:        cajaUpdated.horarioOperacion || null,
            monedaCodigo:            cajaUpdated.monedaCodigo,
            saldoInicial:            Number(cajaUpdated.saldoInicial),
            fechaSaldoInicial:       cajaUpdated.fechaSaldoInicial,
            fechaCreacionCaja:       cajaUpdated.fechaCreacionCaja,
            limiteMaximo:            cajaUpdated.limiteMaximo !== '' ? Number(cajaUpdated.limiteMaximo) : null,
            limiteMinimo:            cajaUpdated.limiteMinimo !== '' ? Number(cajaUpdated.limiteMinimo) : null,
            requiereAutorizacion:    cajaUpdated.requiereAutorizacion,
            montoMaxSinAutorizacion: cajaUpdated.montoMaxSinAutorizacion !== '' ? Number(cajaUpdated.montoMaxSinAutorizacion) : null,
            notificarLimite:         cajaUpdated.notificarLimite !== '' ? Number(cajaUpdated.notificarLimite) : null,
            periodicidadArqueo:      cajaUpdated.periodicidadArqueo,
            idCuentaContable:        Number(cajaUpdated.idCuentaContable),
            centroCosto:             cajaUpdated.centroCosto || null,
            libroContable:           cajaUpdated.libroContable,
            ...(cajaUpdated.motivoCambio && { motivoCambio: cajaUpdated.motivoCambio }),
        };

        try {
            await fetchHelper.put(base_url(API_UPDATE(cajaUpdated.id)), payload, {}, 1000, true);
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
                        {errorMessage && !readOnly && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        <ul className="nav nav-tabs mb-3 flex-wrap">
                            {TABS.map(t => (
                                <li className="nav-item" key={t.id}>
                                    <button className={`nav-link ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                                        <i className={`${t.icon} me-1`} />{t.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Identificación */}
                        {activeTab === 'identificacion' && (
                            <div className="row">
                                <div className="col-md-2 mb-3">
                                    <InputModal id="cu_id" label="ID Caja" value={cajaUpdated.id}
                                        onChange={() => {}} disabled={true} />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputModal id="cu_codigo" label="Código de Caja" value={cajaUpdated.codigoCaja}
                                        onChange={e => set('codigoCaja', e.target.value)} error={errors.codigoCaja}
                                        required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_nombre" label="Nombre de Caja" value={cajaUpdated.nombreCaja}
                                        onChange={e => set('nombreCaja', e.target.value)} error={errors.nombreCaja}
                                        required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputSelectModal id="cu_tipo" label="Tipo de Caja" value={cajaUpdated.tipoCaja}
                                        onChange={v => set('tipoCaja', v)} error={errors.tipoCaja}
                                        options={TIPOS_CAJA} placeholder="Seleccione tipo" required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <InputSelectModal id="cu_estado" label="Estado" value={cajaUpdated.estadoCaja}
                                        onChange={v => set('estadoCaja', v)} error={errors.estadoCaja}
                                        options={ESTADOS_CAJA} placeholder="Seleccione estado" disabled={readOnly} />
                                </div>
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
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cu_horario" label="Horario de Operación" value={cajaUpdated.horarioOperacion}
                                        onChange={e => set('horarioOperacion', e.target.value)} error={errors.horarioOperacion}
                                        placeholder="Ej: L-V 8:00-17:00 (opcional)" disabled={readOnly} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cu_resp_p" label="ID Responsable Principal" type="number"
                                        value={cajaUpdated.idResponsablePrincipal}
                                        onChange={e => set('idResponsablePrincipal', e.target.value)}
                                        error={errors.idResponsablePrincipal} required={true} disabled={readOnly} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cu_resp_s" label="ID Responsable Suplente" type="number"
                                        value={cajaUpdated.idResponsableSuplente}
                                        onChange={e => set('idResponsableSuplente', e.target.value)}
                                        error={errors.idResponsableSuplente} placeholder="Opcional" disabled={readOnly} />
                                </div>
                            </div>
                        )}

                        {/* Datos Financieros */}
                        {activeTab === 'financiero' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_moneda" label="Código Moneda (ISO 4217)" value={cajaUpdated.monedaCodigo}
                                        onChange={e => set('monedaCodigo', e.target.value)} error={errors.monedaCodigo}
                                        placeholder="Ej: COP, USD" required={true} disabled={readOnly} />
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
                                    <InputModal id="cu_cuenta" label="ID Cuenta Contable" type="number"
                                        value={cajaUpdated.idCuentaContable}
                                        onChange={e => set('idCuentaContable', e.target.value)} error={errors.idCuentaContable}
                                        required={!readOnly} disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cu_centro" label="Centro de Costo" value={cajaUpdated.centroCosto}
                                        onChange={e => set('centroCosto', e.target.value)} error={errors.centroCosto}
                                        placeholder="Opcional" disabled={readOnly} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cu_libro" label="Libro Contable" value={cajaUpdated.libroContable}
                                        onChange={v => set('libroContable', v)} error={errors.libroContable}
                                        options={LIBROS_CONTABLES} placeholder="Seleccione libro"
                                        required={!readOnly} disabled={readOnly} />
                                </div>
                                {!readOnly && (
                                    <div className="col-md-12 mb-3">
                                        <TextareaModal id="cu_motivo" label="Motivo del Cambio"
                                            value={cajaUpdated.motivoCambio}
                                            onChange={e => set('motivoCambio', e.target.value)} error={errors.motivoCambio}
                                            placeholder="Obligatorio para cambios sensibles (mínimo 10 caracteres)" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
