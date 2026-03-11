import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const formatCOP = (value) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(value);
};

// POST /api/v1/assets/depreciation/calculate — response.results[].depreciationMethod
const METHOD_LABELS = {
    STRAIGHT_LINE:        'Línea Recta',
    DECLINING_BALANCE:    'Saldo Decreciente',
    UNITS_OF_PRODUCTION:  'Unidades de Producción',
};

const currentPeriod = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const thStyle = { fontSize: '0.8rem', fontWeight: 500 };
const tdStyle = { fontSize: '0.875rem' };

const CalculoDepreciacionActivos = () => {
    const [period, setPeriod] = useState(currentPeriod());
    const [activosElegibles, setActivosElegibles] = useState([]);
    const [resultados, setResultados] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [verificado, setVerificado] = useState(false);
    const [calculado, setCalculado] = useState(false);

    const dismissAlert = () => setAlert({ show: false, type: '', message: '' });

    // ACT-RF-02 — POST /api/v1/assets/depreciation/calculate?period=YYYY-MM
    const callEndpoint = () => {
        const url = base_url(['api', 'v1', 'assets', 'depreciation', 'calculate'], { period });
        return fetchHelper.post(url, {}, {}, 1000, true);
    };

    // Paso 1: verificar activos elegibles (carga results sin mostrar sección de resultados)
    const handleVerificarElegibles = async () => {
        dismissAlert();
        setResultados(null);
        setCalculado(false);
        try {
            const response = await callEndpoint();
            const payload = response.data ?? response; // wrapper { code, data } o respuesta directa
            setActivosElegibles(payload.results || []);
            setVerificado(true);
            if (!payload.results?.length) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: 'No se encontraron activos elegibles para el período seleccionado',
                });
            }
        } catch (error) {
            setActivosElegibles([]);
            setVerificado(true);
            // showErrorAlert=true ya muestra el Swal; este alert es el banner inferior
            const STATUS_MESSAGES = {
                403: 'Acceso denegado. Se requiere rol de administrador.',
                404: 'Cuenta de depreciación faltante o inactiva.',
                422: 'Operación no permitida: el periodo contable está cerrado.',
            };
            setAlert({
                show: true,
                type: 'danger',
                message: STATUS_MESSAGES[error.status] || error.msg || 'Error al verificar activos elegibles',
            });
        }
    };

    // Paso 2: calcular depreciación (carga ambas secciones + muestra alert de resultado)
    const handleCalcularDepreciacion = async () => {
        dismissAlert();
        try {
            const response = await callEndpoint();
            const payload = response.data ?? response; // wrapper { code, data } o respuesta directa
            setActivosElegibles(payload.results || []);
            setResultados(payload);
            setVerificado(true);
            setCalculado(true);
            setAlert({
                show: true,
                type: 'success',
                message: payload.message || response.message || 'Depreciación calculada exitosamente',
            });
        } catch (error) {
            const STATUS_MESSAGES = {
                403: 'Acceso denegado. Se requiere rol de administrador.',
                404: 'Cuenta de depreciación faltante o inactiva.',
                422: 'Operación no permitida: el periodo contable está cerrado.',
            };
            setAlert({
                show: true,
                type: 'danger',
                message: STATUS_MESSAGES[error.status] || error.msg || 'Error al calcular la depreciación',
            });
        }
    };

    return (
        <>
            {/* Título de página */}
            <div className="col-12">
                <h4 className="fw-bold mb-0">Activos</h4>
            </div>

            {/* Ejecución */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body py-3">
                        <p className="fw-semibold mb-3">Ejecución</p>
                        <div className="d-flex gap-3 flex-wrap align-items-end">
                            <div>
                                <label className="form-label mb-1" style={{ fontSize: '0.875rem' }}>
                                    Periodo contable
                                </label>
                                <input
                                    type="month"
                                    className="form-control form-control-sm"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    style={{ width: '160px' }}
                                />
                            </div>
                            <button
                                className="btn btn-outline-secondary waves-effect"
                                onClick={handleVerificarElegibles}
                                disabled={!period}
                            >
                                Verificar activos elegibles
                            </button>
                            <button
                                className="btn btn-primary waves-effect"
                                onClick={handleCalcularDepreciacion}
                                disabled={!period}
                            >
                                Calcular depreciación
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activos elegibles — response.results[] */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body pb-2">
                        <p className="fw-semibold mb-3">Activos elegibles</p>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th className="text-primary ps-0" style={thStyle}>Asset ID</th>
                                        <th className="text-primary" style={thStyle}>Nombre</th>
                                        <th className="text-primary" style={thStyle}>Cuenta activo</th>
                                        <th className="text-primary" style={thStyle}>Clasificación</th>
                                        <th className="text-primary" style={thStyle}>Método</th>
                                        <th className="text-primary" style={thStyle}>F. Cálculo</th>
                                        <th className="text-primary" style={thStyle}>Costo</th>
                                        <th className="text-primary" style={thStyle}>Dep. Periodo</th>
                                        <th className="text-primary" style={thStyle}>Valor Libros · Cta Dep.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activosElegibles.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4 ps-0" style={tdStyle}>
                                                {verificado
                                                    ? 'No hay activos elegibles para el período seleccionado'
                                                    : 'Presione "Verificar activos elegibles" para cargar los datos'}
                                            </td>
                                        </tr>
                                    ) : (
                                        activosElegibles.map((activo) => (
                                            <tr key={activo.assetId} style={tdStyle}>
                                                <td className="ps-0">{activo.assetCode}</td>
                                                <td>{activo.assetName}</td>
                                                <td>{activo.accountingCode}</td>
                                                <td>{activo.accountingName}</td>
                                                <td>{METHOD_LABELS[activo.depreciationMethod] ?? activo.depreciationMethod}</td>
                                                <td>{activo.calculationDate || '—'}</td>
                                                <td>{formatCOP(activo.previousBookValue)}</td>
                                                <td>{formatCOP(activo.depreciationAmount)}</td>
                                                <td>
                                                    {activo.currentBookValue != null
                                                        ? `${formatCOP(activo.currentBookValue)} · ${activo.depreciationAccountName || ''}`.replace(/ · $/, '')
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultados del cálculo — response.results[] + response.skipped[] */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body pb-2">
                        <p className="fw-semibold mb-3">Resultados del cálculo</p>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th className="text-primary ps-0" style={thStyle}>Asset ID</th>
                                        <th className="text-primary" style={thStyle}>Nombre</th>
                                        <th className="text-primary" style={thStyle}>Método</th>
                                        <th className="text-primary" style={thStyle}>Dep. periodo · Cta Dep.</th>
                                        <th className="text-primary" style={thStyle}>Proveedor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!calculado ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4 ps-0" style={tdStyle}>
                                                Presione "Calcular depreciación" para ver los resultados
                                            </td>
                                        </tr>
                                    ) : (
                                        (resultados?.results || []).map((item) => (
                                            <tr key={item.assetId} style={tdStyle}>
                                                <td className="ps-0">{item.assetCode}</td>
                                                <td>{item.assetName}</td>
                                                <td>{METHOD_LABELS[item.depreciationMethod] ?? item.depreciationMethod}</td>
                                                <td>
                                                    {item.depreciationAmount != null
                                                        ? `${formatCOP(item.depreciationAmount)} · ${item.depreciationAccountName || ''}`.replace(/ · $/, '')
                                                        : <span className="text-muted">—</span>}
                                                </td>
                                                <td>{item.supplierName || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Activos excluidos — response.skipped[] */}
                        {calculado && resultados?.skipped?.length > 0 && (
                            <div className="pt-3 mt-2 border-top">
                                <p className="fw-semibold mb-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                    Activos excluidos del cálculo ({resultados.skipped.length})
                                </p>
                                <div className="table-responsive">
                                    <table className="table table-sm table-borderless mb-0">
                                        <thead>
                                            <tr>
                                                <th className="text-muted ps-0" style={thStyle}>AssetID</th>
                                                <th className="text-muted" style={thStyle}>Nombre</th>
                                                <th className="text-muted" style={thStyle}>Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultados.skipped.map((s) => (
                                                <tr key={s.assetId} style={tdStyle}>
                                                    <td className="ps-0 text-muted">{s.assetCode}</td>
                                                    <td className="text-muted">{s.assetName}</td>
                                                    <td className="text-muted">{s.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="pt-3 pb-1 border-top mt-2">
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                Total depreciación del periodo:{' '}
                                {!calculado
                                    ? ''
                                    : resultados?.totalDepreciation != null
                                        ? formatCOP(resultados.totalDepreciation)
                                        : '-----'}
                            </span>
                            {calculado && (
                                <span className="ms-4 text-muted" style={{ fontSize: '0.8rem' }}>
                                    Procesados: {resultados?.processedCount ?? 0} &nbsp;·&nbsp; Excluidos: {resultados?.skippedCount ?? 0}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert de resultado */}
            {alert.show && (
                <div className="col-12">
                    <div
                        className={`alert alert-${alert.type} alert-dismissible d-flex align-items-center mb-0`}
                        role="alert"
                    >
                        <i
                            className={`ri-${alert.type === 'success' ? 'checkbox-circle' : 'error-warning'}-line me-2`}
                            style={{ fontSize: '1.1rem' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{alert.message}</span>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={dismissAlert}
                            aria-label="Cerrar"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default CalculoDepreciacionActivos;
