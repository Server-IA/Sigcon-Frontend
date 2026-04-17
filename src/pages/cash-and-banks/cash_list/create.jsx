import { useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_CREATE = ['api', 'v1', 'cash', 'store'];

const TIPOS_CAJA = [
    { id: 'GENERAL',    label: 'General' },
    { id: 'PETTY_CASH', label: 'Caja Menor' },
    { id: 'FIXED_FUND', label: 'Fondo Fijo' },
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

const emptyCaja = {
    codigoCaja: '', nombreCaja: '', tipoCaja: '', descripcion: '',
    ubicacionFisica: '', idResponsablePrincipal: '', idResponsableSuplente: '', horarioOperacion: '',
    monedaCodigo: '', saldoInicial: '', fechaSaldoInicial: '', fechaCreacionCaja: '',
    limiteMaximo: '', limiteMinimo: '', requiereAutorizacion: false, montoMaxSinAutorizacion: '', notificarLimite: '',
    periodicidadArqueo: '',
    idCuentaContable: '', centroCosto: '', libroContable: '',
};

export default function CreateCaja({ modalRef, modalInstance, caja, setCaja, dataTableRef, setCajaCreate, users, currencyTypes, accountingAccounts, costCenters }) {
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab]       = useState('identificacion');

    const set = (field, value) => setCaja(prev => ({ ...prev, [field]: value }));

    const validate = () => {
        const e = {};
        if (!caja.codigoCaja?.trim())          e.codigoCaja             = 'Campo requerido';
        if (!caja.nombreCaja?.trim())          e.nombreCaja             = 'Campo requerido';
        if (!caja.tipoCaja)                    e.tipoCaja               = 'Campo requerido';
        if (!caja.ubicacionFisica?.trim())     e.ubicacionFisica        = 'Campo requerido';
        if (!caja.idResponsablePrincipal)      e.idResponsablePrincipal = 'Campo requerido';
        if (!caja.monedaCodigo?.trim())        e.monedaCodigo           = 'Campo requerido';
        if (caja.saldoInicial === '')          e.saldoInicial           = 'Campo requerido';
        else if (Number(caja.saldoInicial) < 0) e.saldoInicial         = 'Debe ser ≥ 0';
        if (!caja.fechaSaldoInicial)           e.fechaSaldoInicial      = 'Campo requerido';
        else if (new Date(caja.fechaSaldoInicial) > new Date()) e.fechaSaldoInicial = 'La fecha no puede ser futura';
        if (!caja.fechaCreacionCaja)           e.fechaCreacionCaja      = 'Campo requerido';
        else if (new Date(caja.fechaCreacionCaja) > new Date()) e.fechaCreacionCaja = 'La fecha no puede ser futura';
        if (!caja.periodicidadArqueo)          e.periodicidadArqueo     = 'Campo requerido';
        if (!caja.idCuentaContable)            e.idCuentaContable       = 'Campo requerido';
        if (!caja.libroContable)               e.libroContable          = 'Campo requerido';
        if (caja.limiteMaximo !== '' && Number(caja.limiteMaximo) <= 0) e.limiteMaximo = 'Debe ser > 0';
        if (caja.limiteMinimo !== '' && Number(caja.limiteMinimo) < 0)  e.limiteMinimo = 'Debe ser ≥ 0';
        if (caja.limiteMaximo !== '' && caja.limiteMinimo !== '' &&
            Number(caja.limiteMaximo) <= Number(caja.limiteMinimo)) e.limiteMaximo = 'Debe ser mayor que el límite mínimo';
        if (caja.requiereAutorizacion && caja.montoMaxSinAutorizacion === '')
            e.montoMaxSinAutorizacion = 'Requerido cuando se activa autorización';
        return e;
    };

    const handleCreate = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) {
            setErrors(e);
            setErrorMessage('Por favor corrija los errores antes de continuar.');
            return;
        }
        setErrors({});
        setErrorMessage('');

        const payload = {
            cashCode:                    caja.codigoCaja,
            cashName:                    caja.nombreCaja,
            cashType:                    caja.tipoCaja,
            description:                 caja.descripcion || null,
            physicalLocation:            caja.ubicacionFisica,
            principalResponsibleId:      Number(caja.idResponsablePrincipal),
            alternateResponsibleId:      caja.idResponsableSuplente ? Number(caja.idResponsableSuplente) : null,
            operationSchedule:           caja.horarioOperacion || null,
            currencyId:                  Number(caja.monedaCodigo),
            initialBalanace:             Number(caja.saldoInicial),   // typo intencional del backend
            initialBalanceDay:           caja.fechaSaldoInicial,
            cashCreationDate:            caja.fechaCreacionCaja,
            maxLimit:                    caja.limiteMaximo !== '' ? Number(caja.limiteMaximo) : null,
            minLimit:                    caja.limiteMinimo !== '' ? Number(caja.limiteMinimo) : null,
            requiresAuthorization:       caja.requiereAutorizacion,
            maxAmountWithoutAuthorization: caja.montoMaxSinAutorizacion !== '' ? Number(caja.montoMaxSinAutorizacion) : null,
            notifyLimit:                 caja.notificarLimite !== '' ? Number(caja.notificarLimite) : null,
            auditFrequency:              caja.periodicidadArqueo,
            accountingAccountId:         Number(caja.idCuentaContable),
            costCenterId:                caja.centroCosto !== '' ? Number(caja.centroCosto) : null,
            accountingBook:              caja.libroContable,
        };

        try {
            await fetchHelper.post(base_url(API_CREATE), payload, {}, 1000, true);
            modalInstance?.current?.hide();
            setCaja(emptyCaja);
            setActiveTab('identificacion');
            setCajaCreate(true);
            dataTableRef?.current?.ajax?.reload?.();
        } catch (err) {
            setErrorMessage(err?.msg || 'Error al registrar la caja.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title"><i className="ri-safe-2-line me-2" />Registrar Caja</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

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
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_codigo" label="Código de Caja" value={caja.codigoCaja}
                                        onChange={e => set('codigoCaja', e.target.value)} error={errors.codigoCaja} required={true} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_nombre" label="Nombre de Caja" value={caja.nombreCaja}
                                        onChange={e => set('nombreCaja', e.target.value)} error={errors.nombreCaja} required={true} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_tipo" label="Tipo de Caja" value={caja.tipoCaja}
                                        onChange={v => set('tipoCaja', v)} error={errors.tipoCaja}
                                        options={TIPOS_CAJA} placeholder="Seleccione tipo" required={true} />
                                </div>
                                <div className="col-md-12 mb-3">
                                    <TextareaModal id="cc_desc" label="Descripción" value={caja.descripcion}
                                        onChange={e => set('descripcion', e.target.value)} error={errors.descripcion}
                                        placeholder="Descripción adicional o notas (opcional)" />
                                </div>
                            </div>
                        )}

                        {/* Ubicación y Responsables */}
                        {activeTab === 'ubicacion' && (
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cc_ubicacion" label="Ubicación Física" value={caja.ubicacionFisica}
                                        onChange={e => set('ubicacionFisica', e.target.value)} error={errors.ubicacionFisica} required={true} />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputModal id="cc_horario" label="Horario de Operación" value={caja.horarioOperacion}
                                        onChange={e => set('horarioOperacion', e.target.value)} error={errors.horarioOperacion}
                                        placeholder="Ej: L-V 8:00-17:00 (opcional)" />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputSelectModal id="cc_resp_p" label="Responsable Principal" value={caja.idResponsablePrincipal}
                                        onChange={v => set('idResponsablePrincipal', v)} error={errors.idResponsablePrincipal}
                                        options={users} placeholder="Seleccione responsable principal" required={true} />
                                    {/* <InputModal id="cc_resp_p" label="ID Responsable Principal" type="number"
                                        value={caja.idResponsablePrincipal}
                                        onChange={e => set('idResponsablePrincipal', e.target.value)}
                                        error={errors.idResponsablePrincipal} required={true} /> */}
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputSelectModal id="cc_resp_s" label="Responsable Suplente" value={caja.idResponsableSuplente}
                                        onChange={v => set('idResponsableSuplente', v)} error={errors.idResponsableSuplente}
                                        options={users} placeholder="Seleccione responsable suplente" placeholder="Opcional" />
                                    {/* <InputModal id="cc_resp_s" label="ID Responsable Suplente" type="number"
                                        value={caja.idResponsableSuplente}
                                        onChange={e => set('idResponsableSuplente', e.target.value)}
                                        error={errors.idResponsableSuplente} placeholder="Opcional" /> */}
                                </div>
                            </div>
                        )}

                        {/* Datos Financieros */}
                        {activeTab === 'financiero' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_moneda" label="Moneda" value={caja.monedaCodigo}
                                        onChange={v => set('monedaCodigo', v)} error={errors.monedaCodigo}
                                        options={currencyTypes} placeholder="Seleccione moneda" required={true} />
                                    {/* <InputModal id="cc_moneda" label="ID Moneda" type="number" value={caja.monedaCodigo}
                                        onChange={e => set('monedaCodigo', e.target.value)} error={errors.monedaCodigo}
                                        placeholder="ID numérico de la moneda" required={true} /> */}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_saldo" label="Saldo Inicial" type="number"
                                        value={caja.saldoInicial}
                                        onChange={e => set('saldoInicial', e.target.value)} error={errors.saldoInicial} required={true} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_fecha_saldo" label="Fecha Saldo Inicial" type="date"
                                        value={caja.fechaSaldoInicial}
                                        onChange={e => set('fechaSaldoInicial', e.target.value)} error={errors.fechaSaldoInicial} required={true} />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_fecha_caja" label="Fecha Creación Caja" type="date"
                                        value={caja.fechaCreacionCaja}
                                        onChange={e => set('fechaCreacionCaja', e.target.value)} error={errors.fechaCreacionCaja} required={true} />
                                </div>
                            </div>
                        )}

                        {/* Límites y Alertas */}
                        {activeTab === 'limites' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_lim_max" label="Límite Máximo" type="number"
                                        value={caja.limiteMaximo}
                                        onChange={e => set('limiteMaximo', e.target.value)} error={errors.limiteMaximo}
                                        placeholder="Opcional" />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_lim_min" label="Límite Mínimo" type="number"
                                        value={caja.limiteMinimo}
                                        onChange={e => set('limiteMinimo', e.target.value)} error={errors.limiteMinimo}
                                        placeholder="Opcional" />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal id="cc_notificar" label="Notificar al Límite" type="number"
                                        value={caja.notificarLimite}
                                        onChange={e => set('notificarLimite', e.target.value)} error={errors.notificarLimite}
                                        placeholder="Opcional" />
                                </div>
                                <div className="col-12 mb-3">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" role="switch" id="cc_req_auth"
                                            checked={caja.requiereAutorizacion}
                                            onChange={e => set('requiereAutorizacion', e.target.checked)} />
                                        <label className="form-check-label" htmlFor="cc_req_auth">
                                            Requiere autorización para movimientos <span className="text-danger">*</span>
                                        </label>
                                    </div>
                                </div>
                                {caja.requiereAutorizacion && (
                                    <div className="col-md-4 mb-3">
                                        <InputModal id="cc_monto_auth" label="Monto Máximo sin Autorización" type="number"
                                            value={caja.montoMaxSinAutorizacion}
                                            onChange={e => set('montoMaxSinAutorizacion', e.target.value)}
                                            error={errors.montoMaxSinAutorizacion} required={true} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Operaciones */}
                        {activeTab === 'operaciones' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_periodicidad" label="Periodicidad de Arqueo"
                                        value={caja.periodicidadArqueo}
                                        onChange={v => set('periodicidadArqueo', v)} error={errors.periodicidadArqueo}
                                        options={PERIODICIDAD_ARQUEO} placeholder="Seleccione periodicidad" required={true} />
                                </div>
                            </div>
                        )}

                        {/* Contabilidad */}
                        {activeTab === 'contabilidad' && (
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_cuenta" label="Cuenta Contable" value={caja.idCuentaContable}
                                        onChange={v => set('idCuentaContable', v)} error={errors.idCuentaContable}
                                        options={accountingAccounts.map(aa => {
                                            return {
                                                id: aa.id,
                                                label: aa.pucAccount.code + ' - ' + aa.customName
                                            }
                                        })} placeholder="Seleccione cuenta contable" required={true} />
                                    {/* <InputModal id="cc_cuenta" label="ID Cuenta Contable" type="number"
                                        value={caja.idCuentaContable}
                                        onChange={e => set('idCuentaContable', e.target.value)} error={errors.idCuentaContable} required={true} /> */}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_centro" label="Centro de Costo" value={caja.centroCosto}
                                        onChange={v => set('centroCosto', v)} error={errors.centroCosto}
                                        options={costCenters} placeholder="Seleccione centro de costo" placeholder="Opcional" />
                                    {/* <InputModal id="cc_centro" label="ID Centro de Costo" type="number" value={caja.centroCosto}
                                        onChange={e => set('centroCosto', e.target.value)} error={errors.centroCosto}
                                        placeholder="Opcional" /> */}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal id="cc_libro" label="Libro Contable" value={caja.libroContable}
                                        onChange={v => set('libroContable', v)} error={errors.libroContable}
                                        options={LIBROS_CONTABLES} placeholder="Seleccione libro" required={true} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            <i className="ri-save-line me-1" />Registrar Caja
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
