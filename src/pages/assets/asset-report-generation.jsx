import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../../components/molecules/FormField';
import AlertPage from '../../components/molecules/AlertPage';
import { base_url } from '../../utils/functions';
import { fetchHelper } from '../../utils/fetch';

// ===== DATOS MOCK =====
const FORMATOS_SALIDA = [
    { id: 'pdf', name: 'PDF' },
    { id: 'xlsx', name: 'XLSX' },
    { id: 'csv', name: 'CSV' },
];

const NIVELES_AGRUPACION = [
    { id: 'por_activo', name: 'Por activo' },
    { id: 'por_clase_contable', name: 'Por clase contable' },
    { id: 'periodo_mensual', name: 'Por periodo (mensual)' },
    { id: 'periodo_trimestral', name: 'Por periodo (trimestral)' },
    { id: 'periodo_anual', name: 'Por periodo (anual)' },
];

const TIPOS_ACTIVO = [
    { id: 'todos', name: '(Todos)' },
    { id: 'maquinaria', name: 'Maquinaria' },
    { id: 'equipo_computo', name: 'Equipo de cómputo' },
    { id: 'vehiculos', name: 'Vehículos' },
    { id: 'instalaciones', name: 'Instalaciones' },
    { id: 'muebles', name: 'Muebles y enseres' },
];

const ESTADOS_ACTIVO = [
    { id: 'todos', name: '(Todos)' },
    { id: 'activo', name: 'Activo' },
    { id: 'baja', name: 'Baja' },
    { id: 'transferido', name: 'Transferido' },
];

// Regex YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (str) => {
    if (!str || !REGEX_FECHA.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
};

const AssetReportGeneration = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fechaInicio: '',
        fechaFin: '',
        formatoSalida: 'pdf',
        nivelAgrupacion: 'por_activo',
        periodoContableEstado: 'Abierto', // mock: Abierto | Cerrado
        simularVolumen: '200',
        clasificacionContable: '1516',
        tipoActivo: 'todos',
        estado: 'todos',
        proveedor: '900123456',
        ubicacion: 'Bodega Central',
        centroCosto: '1101 Ventas',
    });

    const [errors, setErrors] = useState({});
    const [reportGenerated, setReportGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [providers, setProviders] = useState([]);

    // Cargar terceros con rol PROVEEDOR para selector
    useEffect(() => {
        fetchHelper.post(base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] }, {}, 0)
            .then(resp => {
                const list = resp?.data ?? resp ?? [];
                if (Array.isArray(list)) {
                    setProviders(list
                        .filter(t => (t.roles || []).some(r => r.name === 'PROVEEDOR'))
                        .map(t => ({
                            id: t.id,
                            name: `${t.nit || ''}${t.dv ? '/' + t.dv : ''} - ${t.businessName || t.firstName || ''}`.trim(),
                        })));
                }
            })
            .catch(() => {});
    }, []);

    const handleFieldChange = (field) => (value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (reportGenerated) setReportGenerated(false);
    };

    const validate = () => {
        const newErrors = {};

        // Fecha inicio: obligatoria, formato YYYY-MM-DD
        if (!formData.fechaInicio) {
            newErrors.fechaInicio = 'Ingrese la fecha de inicio';
        } else if (!isValidDateString(formData.fechaInicio)) {
            newErrors.fechaInicio = 'La fecha debe tener formato YYYY-MM-DD';
        }

        // Fecha fin: obligatoria, formato YYYY-MM-DD, fecha_inicio ≤ fecha_fin
        if (!formData.fechaFin) {
            newErrors.fechaFin = 'Ingrese la fecha fin';
        } else if (!isValidDateString(formData.fechaFin)) {
            newErrors.fechaFin = 'La fecha debe tener formato YYYY-MM-DD';
        } else if (formData.fechaInicio && formData.fechaFin && formData.fechaInicio > formData.fechaFin) {
            newErrors.fechaFin = 'La fecha fin debe ser mayor o igual a la fecha de inicio';
        }

        // Formato de salida: obligatorio
        if (!formData.formatoSalida) {
            newErrors.formatoSalida = 'Seleccione el formato de salida';
        }

        // Nivel de agrupación: obligatorio
        if (!formData.nivelAgrupacion) {
            newErrors.nivelAgrupacion = 'Seleccione el nivel de agrupación';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePreview = () => {
        if (!validate()) return;
        setErrorMessage('');
        setShowPreview(true);
    };

    // HU-ACT-04: traduce nivelAgrupacion del form al parametro `groupBy` que
    // espera el backend (asset | classification | period).
    const mapGroupBy = (nivel) => {
        switch (nivel) {
            case 'por_clase_contable': return 'classification';
            case 'periodo_mensual':
            case 'periodo_trimestral':
            case 'periodo_anual':      return 'period';
            case 'por_activo':
            default:                   return 'asset';
        }
    };

    const handleGenerate = async () => {
        if (!validate()) return;

        setIsGenerating(true);
        setErrorMessage('');

        const payload = {
            startDate: formData.fechaInicio,
            endDate:   formData.fechaFin,
            groupBy:   mapGroupBy(formData.nivelAgrupacion),
        };

        try {
            if (formData.formatoSalida === 'pdf') {
                // Descarga del PDF: pedimos blob a traves de fetch nativo para
                // poder disparar download en el navegador.
                const token = localStorage.getItem('token');
                const resp = await fetch(
                    base_url(['api', 'v1', 'assets', 'reports', 'generate', 'pdf']),
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(payload),
                    }
                );

                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(txt || `Error HTTP ${resp.status}`);
                }

                const blob = await resp.blob();
                const url  = window.URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url;
                a.download = `reporte_activos_${payload.startDate}_${payload.endDate}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                setReportGenerated(true);
            } else {
                // JSON (para previsualizacion y posterior export XLSX/CSV client-side).
                const response = await fetchHelper.post(
                    base_url(['api', 'v1', 'assets', 'reports', 'generate']),
                    payload, {}, 0
                );

                const data = response?.data ?? response ?? [];
                const rows = Array.isArray(data) ? data
                    : (data && typeof data === 'object'
                        ? Object.values(data).flat()
                        : []);

                if (rows.length > 0) {
                    setReportData(rows);
                    setReportGenerated(true);
                } else {
                    setErrorMessage('No se encontraron activos para los filtros seleccionados.');
                }
            }
        } catch (error) {
            console.error(error);
            setErrorMessage(error?.msg || error?.message || 'Error al generar el informe. Intente nuevamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setFormData({
            fechaInicio: '',
            fechaFin: '',
            formatoSalida: 'pdf',
            nivelAgrupacion: 'por_activo',
            periodoContableEstado: 'Abierto',
            simularVolumen: '200',
            clasificacionContable: '',
            tipoActivo: 'todos',
            estado: 'todos',
            proveedor: '',
            ubicacion: '',
            centroCosto: '',
        });
        setErrors({});
        setReportGenerated(false);
        setShowPreview(false);
        setErrorMessage('');
    };

    const handleBack = () => navigate(-1);

    const registroCount = parseInt(formData.simularVolumen, 10) || 0;
    const modoGeneracion = registroCount > 1000 ? 'batch y notificación simulada' : 'sincrono';

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title fw-bold mb-4" style={{ fontSize: '1.35rem' }}>
                    Activos
                </h5>

                <AlertPage
                    type="success"
                    message="Reporte generado con exito"
                    show={reportGenerated}
                    onChange={() => setReportGenerated(false)}
                />
                <AlertPage type="danger" message={errorMessage} show={!!errorMessage} onChange={() => setErrorMessage('')} />
                <AlertPage
                    type="info"
                    message="Periodo contable cerrado — se generará informe con datos históricos (sin operaciones en edición)."
                    show={formData.periodoContableEstado === 'Cerrado'}
                    onChange={() => {}}
                />

                <div className="card border mb-4">
                    <div className="card-header">
                        <h6 className="mb-0 fw-bold">Parámetros del informe</h6>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <FormField
                                type="date"
                                id="fechaInicio"
                                label="Fecha inicio (YYYY-MM-DD)"
                                value={formData.fechaInicio}
                                onChange={handleFieldChange('fechaInicio')}
                                error={errors.fechaInicio}
                                required
                                colClass="col-md-6"
                            />
                            <FormField
                                type="date"
                                id="fechaFin"
                                label="Fecha fin (YYYY-MM-DD)"
                                value={formData.fechaFin}
                                onChange={handleFieldChange('fechaFin')}
                                error={errors.fechaFin}
                                required
                                colClass="col-md-6"
                            />
                        </div>

                        <div className="row">
                            <FormField
                                type="select"
                                id="formatoSalida"
                                label="Formato de salida"
                                value={formData.formatoSalida}
                                onChange={handleFieldChange('formatoSalida')}
                                options={FORMATOS_SALIDA}
                                placeholder="Seleccione formato"
                                error={errors.formatoSalida}
                                required
                                colClass="col-md-6"
                            />
                            <FormField
                                type="select"
                                id="nivelAgrupacion"
                                label="Nivel de agrupación"
                                value={formData.nivelAgrupacion}
                                onChange={handleFieldChange('nivelAgrupacion')}
                                options={NIVELES_AGRUPACION}
                                placeholder="Seleccione nivel"
                                error={errors.nivelAgrupacion}
                                required
                                colClass="col-md-6"
                            />
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="text"
                                        id="periodoContableEstado"
                                        className="form-control bg-light"
                                        value={formData.periodoContableEstado}
                                        readOnly
                                    />
                                    <label htmlFor="periodoContableEstado">Periodo contable (estado)</label>
                                </div>
                                <small className="form-text text-muted d-block mt-1">
                                    Definido por el sistema. Si está cerrado, se muestra aviso.
                                </small>
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Simular volumen</label>
                                <input
                                    type="number"
                                    id="simularVolumen"
                                    className="form-control"
                                    placeholder="Ej: 200"
                                    value={formData.simularVolumen}
                                    onChange={(e) => handleFieldChange('simularVolumen')(e.target.value)}
                                    min={1}
                                />
                                <small className="form-text text-muted d-block mt-1">
                                    {registroCount} reg. ({modoGeneracion}). &gt; 1000 → batch y notificación simulada
                                </small>
                            </div>
                        </div>

                        <div className="row">
                            <FormField
                                type="text"
                                id="clasificacionContable"
                                label="Clasificación contable (código)"
                                value={formData.clasificacionContable}
                                onChange={handleFieldChange('clasificacionContable')}
                                placeholder="Ej: 1516"
                                colClass="col-md-6"
                            />
                            <FormField
                                type="select"
                                id="tipoActivo"
                                label="Tipo de activo"
                                value={formData.tipoActivo}
                                onChange={handleFieldChange('tipoActivo')}
                                options={TIPOS_ACTIVO}
                                placeholder="Seleccione"
                                colClass="col-md-6"
                            />
                        </div>

                        <div className="row">
                            <FormField
                                type="select"
                                id="estado"
                                label="Estado"
                                value={formData.estado}
                                onChange={handleFieldChange('estado')}
                                options={ESTADOS_ACTIVO}
                                placeholder="Seleccione"
                                colClass="col-md-6"
                            />
                            <FormField
                                type="select"
                                id="proveedor"
                                label="Proveedor"
                                value={formData.proveedor}
                                onChange={handleFieldChange('proveedor')}
                                options={[{ id: '', name: '(Todos)' }, ...providers]}
                                placeholder="Seleccione un proveedor"
                                colClass="col-md-6"
                            />
                        </div>

                        <div className="row">
                            <FormField
                                type="search"
                                id="ubicacion"
                                label="Ubicación"
                                value={formData.ubicacion}
                                onChange={handleFieldChange('ubicacion')}
                                placeholder="Ej: Bodega Central"
                                colClass="col-md-6"
                            />
                            <FormField
                                type="search"
                                id="centroCosto"
                                label="Centro de costo"
                                value={formData.centroCosto}
                                onChange={handleFieldChange('centroCosto')}
                                placeholder="Ej: 1101 Ventas"
                                colClass="col-md-6"
                            />
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button type="button" className="btn btn-outline-primary" onClick={handlePreview}>
                                Previsualizar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Generando...
                                    </>
                                ) : (
                                    'Generar / Descargar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {(showPreview || reportGenerated) && (
                    <div className="card border">
                        <div className="card-header">
                            <h6 className="mb-0 fw-bold">Previsualización</h6>
                        </div>
                        <div className="card-body overflow-auto">
                            <table className="table table-bordered table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>AssetID</th>
                                        <th>Código clasificación</th>
                                        <th>Descripción</th>
                                        <th>Fecha adquisición</th>
                                        <th>Valor adquisición</th>
                                        <th>Deprec. acumulada</th>
                                        <th>Valor neto</th>
                                        <th>Movimiento (fecha)</th>
                                        <th>Tipo mov.</th>
                                        <th>Cuenta contable</th>
                                        <th>Monto mov.</th>
                                        <th>Proveedor</th>
                                        <th>Ubicación</th>
                                        <th>Comentarios/docs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>ACT-1001</td>
                                        <td>1516</td>
                                        <td>Equipo de computo</td>
                                        <td>2025-10-11</td>
                                        <td>$2&apos;000.000</td>
                                        <td>$0,00</td>
                                        <td>$2&apos;000.000</td>
                                        <td>2025-10-15</td>
                                        <td>venta</td>
                                        <td>151605</td>
                                        <td>$450.000</td>
                                        <td>9001101 - ABC PROVEEDOR</td>
                                        <td>SEDE NORTE</td>
                                        <td>factura.pdf</td>
                                    </tr>
                                    <tr>
                                        <td>ACT-1002</td>
                                        <td>1516</td>
                                        <td>Mueble de oficina</td>
                                        <td>2025-09-01</td>
                                        <td>$1&apos;500.000</td>
                                        <td>$125.000</td>
                                        <td>$1&apos;375.000</td>
                                        <td>2025-10-20</td>
                                        <td>depreciacion</td>
                                        <td>159210</td>
                                        <td>-$125.000</td>
                                        <td>9001234 - MUEBLES SA</td>
                                        <td>BODEGA CENTRAL</td>
                                        <td>—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="d-flex align-items-center gap-2 mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                        Limpiar
                    </button>
                    <button type="button" className="btn btn-outline-danger ms-auto" onClick={handleBack}>
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetReportGeneration;
