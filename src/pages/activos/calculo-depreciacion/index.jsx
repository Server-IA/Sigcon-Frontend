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

const thStyle = { fontSize: '0.8rem', fontWeight: 500 };
const tdStyle = { fontSize: '0.875rem' };

const CalculoDepreciacionActivos = () => {
    const [activosElegibles, setActivosElegibles] = useState([]);
    const [resultados, setResultados] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [verificado, setVerificado] = useState(false);
    const [calculado, setCalculado] = useState(false);

    const dismissAlert = () => setAlert({ show: false, type: '', message: '' });

    // ACT-RF-02 — Paso 1: verificar activos elegibles
    const handleVerificarElegibles = async () => {
        dismissAlert();
        setResultados(null);
        setCalculado(false);
        try {
            const url = base_url(['api', 'v1', 'assets', 'eligible-for-depreciation']);
            const { data } = await fetchHelper.get(url, {}, 500);
            setActivosElegibles(data || []);
            setVerificado(true);
        } catch (error) {
            setActivosElegibles([]);
            setVerificado(true);
            setAlert({
                show: true,
                type: 'danger',
                message: error.msg || 'Error al verificar activos elegibles',
            });
        }
    };

    // ACT-RF-02 — Paso 2: ejecutar cálculo de depreciación
    const handleCalcularDepreciacion = async () => {
        dismissAlert();
        try {
            const url = base_url(['api', 'v1', 'assets', 'calculate-depreciation']);
            const { data } = await fetchHelper.post(url, {}, {}, 1000);

            // Propagar marcadores de error a la tabla de activos elegibles
            if (data.items?.length) {
                setActivosElegibles(prev =>
                    prev.map(activo => {
                        const item = data.items.find(i => i.assetId === activo.assetId);
                        return item ? { ...activo, metodoError: !!item.error } : activo;
                    })
                );
            }

            setResultados(data);
            setCalculado(true);

            const hasErrors = data.items?.some(i => i.error);
            if (!hasErrors) {
                setAlert({
                    show: true,
                    type: 'success',
                    message: data.message || 'Depreciación calculada exitosamente',
                });
            }
        } catch (error) {
            // El backend puede devolver resultados parciales con errores por activo
            if (error.data?.items) {
                setActivosElegibles(prev =>
                    prev.map(activo => {
                        const item = error.data.items.find(i => i.assetId === activo.assetId);
                        return item ? { ...activo, metodoError: !!item.error } : activo;
                    })
                );
                setResultados(error.data);
                setCalculado(true);
            }
            setAlert({
                show: true,
                type: 'danger',
                message: error.msg || 'Error al calcular la depreciación',
            });
        }
    };

    const hasItemErrors = resultados?.items?.some(i => i.error);
    const total = hasItemErrors ? null : resultados?.total;

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
                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className="btn btn-outline-secondary waves-effect"
                                onClick={handleVerificarElegibles}
                            >
                                Verificar activos elegibles
                            </button>
                            <button
                                className="btn btn-success waves-effect"
                                onClick={handleCalcularDepreciacion}
                            >
                                Calcular depreciación
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activos elegibles */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body pb-2">
                        <p className="fw-semibold mb-3">Activos elegibles</p>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th className="text-primary ps-0" style={thStyle}>AssetID</th>
                                        <th className="text-primary" style={thStyle}>Cuenta activo</th>
                                        <th className="text-primary" style={thStyle}>Clasificación</th>
                                        <th className="text-primary" style={thStyle}>Método</th>
                                        <th className="text-primary" style={thStyle}>Vida (meses)</th>
                                        <th className="text-primary" style={thStyle}>F. Adq</th>
                                        <th className="text-primary" style={thStyle}>Costo</th>
                                        <th className="text-primary" style={thStyle}>Dep. Acum</th>
                                        <th className="text-primary" style={thStyle}>Residual Cta Dep.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activosElegibles.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4 ps-0" style={tdStyle}>
                                                {verificado
                                                    ? 'No hay activos elegibles para el período actual'
                                                    : 'Presione "Verificar activos elegibles" para cargar los datos'}
                                            </td>
                                        </tr>
                                    ) : (
                                        activosElegibles.map((activo) => (
                                            <tr key={activo.assetId} style={tdStyle}>
                                                <td className="ps-0">{activo.assetId}</td>
                                                <td>{activo.cuentaActivo}</td>
                                                <td>{activo.clasificacion}</td>
                                                <td className={activo.metodoError ? 'text-danger' : ''}>
                                                    {activo.metodoError ? 'error' : activo.metodo}
                                                </td>
                                                <td>{activo.vidaMeses}</td>
                                                <td>{activo.fechaAdquisicion || '—'}</td>
                                                <td>{formatCOP(activo.costo)}</td>
                                                <td>{formatCOP(activo.depAcumulada)}</td>
                                                <td>
                                                    {activo.residual != null
                                                        ? `${formatCOP(activo.residual)} ${activo.ctaDep || ''}`.trim()
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

            {/* Resultados del cálculo */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body pb-2">
                        <p className="fw-semibold mb-3">Resultados del cálculo</p>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th className="text-primary ps-0" style={thStyle}>AssetID</th>
                                        <th className="text-primary" style={thStyle}>Base</th>
                                        <th className="text-primary" style={thStyle}>Vida</th>
                                        <th className="text-primary" style={thStyle}>Método</th>
                                        <th className="text-primary" style={thStyle}>Dep. periodo Cta Dep.</th>
                                        <th className="text-primary" style={thStyle}>Impacto fiscal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!calculado ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-4 ps-0" style={tdStyle}>
                                                Presione "Calcular depreciación" para ver los resultados
                                            </td>
                                        </tr>
                                    ) : (
                                        (resultados?.items || []).map((item) => (
                                            <tr key={item.assetId} style={tdStyle}>
                                                <td className="ps-0">{item.assetId}</td>
                                                <td>{formatCOP(item.base)}</td>
                                                <td>{item.vida}</td>
                                                <td className={item.error ? 'text-danger' : ''}>
                                                    {item.error ? 'error' : item.metodo}
                                                </td>
                                                <td>
                                                    {item.error || item.depPeriodo == null
                                                        ? <span className="text-muted">—</span>
                                                        : `${formatCOP(item.depPeriodo)} ${item.ctaDep || ''}`.trim()}
                                                </td>
                                                <td>{item.impactoFiscal || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="pt-3 pb-1 border-top mt-1">
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                Total depreciación del periodo:{' '}
                                {!calculado
                                    ? ''
                                    : total != null
                                        ? formatCOP(total)
                                        : '-----'}
                            </span>
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
