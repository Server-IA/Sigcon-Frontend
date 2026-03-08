import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../../../components/molecules/FormField';
import AlertPage from '../../../components/molecules/AlertPage';
// import { base_url } from '../../../utils/functions';
// const API_GENERATE_REPORT = ['api', 'reportes', 'auxiliares-cuentas'];

// ===== DATOS MOCK =====
const PERIODOS_CONTABLES = [
    { id: '2024-T1', name: '2024 - Trimestre 1' },
    { id: '2024-T2', name: '2024 - Trimestre 2' },
    { id: '2024-T3', name: '2024 - Trimestre 3' },
    { id: '2024-T4', name: '2024 - Trimestre 4' },
    { id: '2025-T1', name: '2025 - Trimestre 1' },
];

const TIPOS_TERCERO = [
    { id: 'cliente', name: 'Cliente' },
    { id: 'proveedor', name: 'Proveedor' },
    { id: 'empleado', name: 'Empleado' },
];

const FORMATOS = [
    { id: 'csv', name: 'CSV' },
    { id: 'xlsx', name: 'XLSX' },
    { id: 'pdf', name: 'PDF' },
];

const AuxiliaresCuentas = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        periodoContable: '',
        tipoTercero: '',
        idCuentaContable: '',
        idComprobante: '',
        centroCosto: '',
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
        if (!formData.formato) newErrors.formato = 'Seleccione un formato';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGenerateReport = async () => {
        if (!validate()) return;

        setIsGenerating(true);
        setErrorMessage('');

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const now = new Date();
            const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

            setGeneratedFile({
                name: `Auxiliares_cuentas.${formData.formato}`,
                size: '28kb',
                date: dateStr,
                downloadUrl: null,
            });
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
            tipoTercero: '',
            idCuentaContable: '',
            idComprobante: '',
            centroCosto: '',
            formato: '',
        });
        setErrors({});
        setReportGenerated(false);
        setGeneratedFile(null);
        setErrorMessage('');
    };

    const handleBack = () => navigate(-1);
    const handleDownload = () => { /* TODO */ };

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title fw-bold mb-4" style={{ fontSize: '1.35rem' }}>
                    Auxiliares de cuentas
                </h5>

                <AlertPage type="success" message="Reporte generado exitosamente" show={reportGenerated} onChange={() => setReportGenerated(false)} />
                <AlertPage type="danger" message={errorMessage} show={!!errorMessage} onChange={() => setErrorMessage('')} />

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
                        id="tipoTercero"
                        label="Tipo de Tercero"
                        value={formData.tipoTercero}
                        onChange={handleFieldChange('tipoTercero')}
                        options={TIPOS_TERCERO}
                        placeholder="Please Select"
                        helperText="Cliente-Proveedor-Empleado"
                        colClass="col-md-6"
                    />
                </div>

                <div className="row">
                    <FormField
                        type="search"
                        id="idCuentaContable"
                        label="ID Cuenta Contable"
                        value={formData.idCuentaContable}
                        onChange={handleFieldChange('idCuentaContable')}
                        placeholder="ID"
                        colClass="col-md-6"
                    />

                    <FormField
                        type="search"
                        id="idComprobante"
                        label="ID Comprobante"
                        value={formData.idComprobante}
                        onChange={handleFieldChange('idComprobante')}
                        placeholder="ID"
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
                </div>

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

                {reportGenerated && generatedFile && (
                    <div className="row mt-3">
                        <div className="col-12">
                            <div
                                className="d-flex align-items-center justify-content-between p-3 rounded-3"
                                style={{ border: '1px solid #e0e0e0', backgroundColor: '#fafbfc', maxWidth: '400px', marginLeft: 'auto' }}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center justify-content-center rounded" style={{ width: '42px', height: '42px', backgroundColor: '#e8f0fe', color: '#4285f4' }}>
                                        <i className="ri-file-text-line" style={{ fontSize: '1.3rem' }}></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{generatedFile.name}</div>
                                        <small className="text-muted">{generatedFile.size} - {generatedFile.date}</small>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-icon btn-outline-secondary rounded-circle" onClick={handleDownload} title="Descargar">
                                    <i className="ri-download-2-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="d-flex align-items-center gap-2 mt-4">
                    {!reportGenerated ? (
                        <>
                            <button type="button" className="btn btn-primary" onClick={handleGenerateReport} disabled={isGenerating}>
                                {isGenerating ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generando...</> : 'Generar Reporte'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>Limpiar</button>
                            <button type="button" className="btn btn-outline-danger ms-auto" onClick={handleBack}>Volver</button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn-primary" onClick={() => {}}>Vista Previa</button>
                            <button type="button" className="btn btn-outline-danger" onClick={handleBack}>Volver</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuxiliaresCuentas;
