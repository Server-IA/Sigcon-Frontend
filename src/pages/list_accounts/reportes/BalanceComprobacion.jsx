import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../../../components/molecules/FormField';
import AlertPage from '../../../components/molecules/AlertPage';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

// ===== API =====
// TODO: Ajustar la ruta cuando el backend esté listo
const API_GENERATE_REPORT = ['api', 'reportes', 'balance-comprobacion'];

// ===== DATOS MOCK =====
// TODO: Reemplazar con datos del backend cuando estén disponibles
const PERIODOS_CONTABLES = [
    { id: '2024-T1', name: '2024 - Trimestre 1' },
    { id: '2024-T2', name: '2024 - Trimestre 2' },
    { id: '2024-T3', name: '2024 - Trimestre 3' },
    { id: '2024-T4', name: '2024 - Trimestre 4' },
    { id: '2025-T1', name: '2025 - Trimestre 1' },
    { id: '2025-T2', name: '2025 - Trimestre 2' },
    { id: '2025-T3', name: '2025 - Trimestre 3' },
    { id: '2025-ENE', name: '2025 - Enero' },
    { id: '2025-FEB', name: '2025 - Febrero' },
    { id: '2025-MAR', name: '2025 - Marzo' },
];

const NIVELES_DETALLE = [
    { id: 'cuenta', name: 'Cuenta' },
    { id: 'subcuenta', name: 'Subcuenta' },
    { id: 'subgrupo', name: 'Subgrupo' },
    { id: 'cada', name: 'Cada' },
];

const TIPOS_PRESENTACION = [
    { id: 'acumulado', name: 'Acumulado' },
    { id: 'mensual', name: 'Mensual' },
    { id: 'general', name: 'General' },
    { id: 'resumido', name: 'Resumido' },
    { id: 'comparativo', name: 'Comparativo' },
];

const FORMATOS = [
    { id: 'csv', name: 'CSV' },
    { id: 'xlsx', name: 'XLSX' },
    { id: 'pdf', name: 'PDF' },
];

const BalanceComprobacion = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        periodoContable: '',
        nivelDetalle: '',
        centroCosto: '',
        tipoPresentacion: '',
        formato: '',
    });

    const [errors, setErrors] = useState({});
    const [reportGenerated, setReportGenerated] = useState(false);
    const [generatedFile, setGeneratedFile] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleFieldChange = (field) => (value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (reportGenerated) {
            setReportGenerated(false);
            setGeneratedFile(null);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.periodoContable) newErrors.periodoContable = 'Seleccione un periodo contable';
        if (!formData.nivelDetalle) newErrors.nivelDetalle = 'Seleccione el nivel de detalle';
        if (!formData.tipoPresentacion) newErrors.tipoPresentacion = 'Seleccione el tipo de presentación';
        if (!formData.formato) newErrors.formato = 'Seleccione un formato';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGenerateReport = async () => {
        if (!validate()) return;

        setIsGenerating(true);
        setErrorMessage('');

        try {
            // ====================================================
            // TODO: Descomentar cuando el backend esté listo
            // ====================================================
            // const url = base_url(API_GENERATE_REPORT);
            // const payload = {
            //     periodoContable: formData.periodoContable,
            //     nivelDetalle: formData.nivelDetalle,
            //     centroCosto: formData.centroCosto || null,
            //     tipoPresentacion: formData.tipoPresentacion,
            //     formato: formData.formato,
            // };
            //
            // const response = await fetchHelper.post(url, payload, {}, 30000);
            //
            // // Si el backend devuelve un blob (archivo), descargarlo:
            // // const blob = await response.blob();
            // // const fileUrl = window.URL.createObjectURL(blob);
            //
            // setGeneratedFile({
            //     name: response.fileName || `Balance_de_comprobacion.${formData.formato}`,
            //     size: response.fileSize || 'N/A',
            //     date: response.generatedAt || new Date().toLocaleDateString('es-CO'),
            //     downloadUrl: response.downloadUrl || fileUrl,
            // });
            // ====================================================

            // 🔹 MOCK: Simular respuesta del backend (remover cuando se conecte la API)
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

            setGeneratedFile({
                name: `Balance_de_comprobacion.${formData.formato}`,
                size: '30kb',
                date: dateStr,
                downloadUrl: null, // TODO: URL real del backend
            });
            // 🔹 FIN MOCK

            setReportGenerated(true);
        } catch (error) {
            console.error('Error al generar reporte:', error);
            setErrorMessage(error?.msg || 'Error al generar el reporte. Intente nuevamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setFormData({
            periodoContable: '',
            nivelDetalle: '',
            centroCosto: '',
            tipoPresentacion: '',
            formato: '',
        });
        setErrors({});
        setReportGenerated(false);
        setGeneratedFile(null);
        setErrorMessage('');
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handlePreview = () => {
        // TODO: Abrir vista previa del archivo generado
        // if (generatedFile?.downloadUrl) {
        //     window.open(generatedFile.downloadUrl, '_blank');
        // }
    };

    const handleDownload = () => {
        // TODO: Descargar el archivo generado desde la URL del backend
        // if (generatedFile?.downloadUrl) {
        //     const link = document.createElement('a');
        //     link.href = generatedFile.downloadUrl;
        //     link.download = generatedFile.name;
        //     document.body.appendChild(link);
        //     link.click();
        //     document.body.removeChild(link);
        // }
    };

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title fw-bold mb-4" style={{ fontSize: '1.35rem' }}>
                    Balance de Comprobación
                </h5>

                <AlertPage type="success" message="Reporte generado exitosamente" show={reportGenerated} onChange={() => setReportGenerated(false)} />
                <AlertPage type="danger" message={errorMessage} show={!!errorMessage} onChange={() => setErrorMessage('')} />

                {/* Formulario de parámetros */}
                <div className="row">
                    <FormField
                        type="select"
                        id="periodoContable"
                        label="Periodo contable"
                        value={formData.periodoContable}
                        onChange={handleFieldChange('periodoContable')}
                        options={PERIODOS_CONTABLES}
                        placeholder="Seleccione un periodo"
                        helperText="Seleccionar año, trimestre, mes o rango"
                        error={errors.periodoContable}
                        required
                        colClass="col-md-6"
                    />

                    <FormField
                        type="select"
                        id="nivelDetalle"
                        label="Nivel de detalle"
                        value={formData.nivelDetalle}
                        onChange={handleFieldChange('nivelDetalle')}
                        options={NIVELES_DETALLE}
                        placeholder="Seleccione nivel"
                        helperText="Cada - Subgrupo - Cuenta - Subcuenta"
                        error={errors.nivelDetalle}
                        required
                        colClass="col-md-6"
                    />
                </div>

                <div className="row">
                    <FormField
                        type="search"
                        id="centroCosto"
                        label="ID Centro de costo (opcional)"
                        value={formData.centroCosto}
                        onChange={handleFieldChange('centroCosto')}
                        placeholder="Buscar centro de costo"
                        colClass="col-md-6"
                    />

                    <FormField
                        type="select"
                        id="tipoPresentacion"
                        label="Tipo de presentación"
                        value={formData.tipoPresentacion}
                        onChange={handleFieldChange('tipoPresentacion')}
                        options={TIPOS_PRESENTACION}
                        placeholder="Seleccione tipo"
                        helperText="Acumulado - Mensual - General - Resumido - Comparativo"
                        error={errors.tipoPresentacion}
                        required
                        colClass="col-md-6"
                    />
                </div>

                {/* Selección de formato */}
                <hr className="my-4" />
                <h6 className="fw-bold mb-3" style={{ fontSize: '1.1rem' }}>
                    Seleccione el formato:
                </h6>

                <div className="row">
                    <FormField
                        type="select"
                        id="formato"
                        label="Formato"
                        value={formData.formato}
                        onChange={handleFieldChange('formato')}
                        options={FORMATOS}
                        placeholder="Please Select"
                        error={errors.formato}
                        required
                        colClass="col-md-3"
                    />
                </div>

                {/* Archivo generado */}
                {reportGenerated && generatedFile && (
                    <div className="row mt-3">
                        <div className="col-12">
                            <div
                                className="d-flex align-items-center justify-content-between p-3 rounded-3"
                                style={{
                                    border: '1px solid #e0e0e0',
                                    backgroundColor: '#fafbfc',
                                    maxWidth: '400px',
                                    marginLeft: 'auto',
                                }}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded"
                                        style={{
                                            width: '42px',
                                            height: '42px',
                                            backgroundColor: '#e8f0fe',
                                            color: '#4285f4',
                                        }}
                                    >
                                        <i className="ri-file-text-line" style={{ fontSize: '1.3rem' }}></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                            {generatedFile.name}
                                        </div>
                                        <small className="text-muted">
                                            {generatedFile.size} - {generatedFile.date}
                                        </small>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-sm btn-icon btn-outline-secondary rounded-circle"
                                    onClick={handleDownload}
                                    title="Descargar"
                                >
                                    <i className="ri-download-2-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="d-flex align-items-center gap-2 mt-4">
                    {!reportGenerated ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleGenerateReport}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Generando...
                                    </>
                                ) : (
                                    'Generar Reporte'
                                )}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                                Limpiar
                            </button>
                            <button type="button" className="btn btn-outline-danger ms-auto" onClick={handleBack}>
                                Volver
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn-primary" onClick={handlePreview}>
                                Vista Previa
                            </button>
                            <button type="button" className="btn btn-outline-danger" onClick={handleBack}>
                                Volver
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalanceComprobacion;
