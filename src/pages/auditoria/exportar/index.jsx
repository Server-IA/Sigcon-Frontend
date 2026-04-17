import { useState } from 'react';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-AU-06: Página para exportar logs de auditoría en CSV, Excel o PDF.
 */
const IndexAuditExport = () => {
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const download = async (format) => {
        setLoading(true);
        try {
            const url = base_url(['api', 'v1', 'audit', 'export', format]);
            const token = localStorage.getItem('token');
            const resp = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit-logs.${format === 'pdf' ? 'txt' : format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            setAlert({ show: true, type: 'success', message: `Reporte ${format.toUpperCase()} descargado correctamente` });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'No se pudo generar el reporte' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-download-2-line me-2"></i> Exportación de Logs de Auditoría
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <p className="text-muted">
                    Genera reportes con los últimos 1000 logs de auditoría en distintos formatos.
                    El evento de exportación queda registrado automáticamente en el log de auditoría
                    (HU-AU-06 E6).
                </p>

                <div className="row g-3 mt-3">
                    <div className="col-md-4">
                        <div className="card h-100">
                            <div className="card-body text-center">
                                <i className="ri-file-text-line ri-48px text-success mb-3"></i>
                                <h5>CSV</h5>
                                <p className="small text-muted">
                                    Formato compatible con Excel, OpenOffice y herramientas de análisis.
                                    Incluye BOM UTF-8 para caracteres especiales.
                                </p>
                                <button className="btn btn-success" onClick={() => download('csv')} disabled={loading}>
                                    {loading
                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Generando...</>
                                        : <><i className="ri-download-2-line me-1"></i>Descargar CSV</>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card h-100">
                            <div className="card-body text-center">
                                <i className="ri-file-excel-line ri-48px text-primary mb-3"></i>
                                <h5>Excel (XLSX)</h5>
                                <p className="small text-muted">
                                    Hoja de cálculo Excel con encabezados formateados.
                                    Compatible con Microsoft Excel 2007+.
                                </p>
                                <button className="btn btn-primary" onClick={() => download('xlsx')} disabled={loading}>
                                    {loading
                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Generando...</>
                                        : <><i className="ri-download-2-line me-1"></i>Descargar Excel</>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card h-100">
                            <div className="card-body text-center">
                                <i className="ri-file-pdf-line ri-48px text-danger mb-3"></i>
                                <h5>PDF / Texto</h5>
                                <p className="small text-muted">
                                    Reporte en formato texto plano formateado.
                                    Útil para auditorías externas.
                                </p>
                                <button className="btn btn-danger" onClick={() => download('pdf')} disabled={loading}>
                                    {loading
                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Generando...</>
                                        : <><i className="ri-download-2-line me-1"></i>Descargar Reporte</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="alert alert-info mt-4 small">
                    <i className="ri-information-line me-1"></i>
                    Los reportes incluyen las columnas: ID, Fecha, Usuario, Acción, Entidad, ID Entidad,
                    Módulo, Severidad, Descripción, IP, Hash. Cada exportación queda registrada en el log
                    de auditoría con el formato y la cantidad de registros descargados.
                </div>
            </div>
        </div>
    );
};

export default IndexAuditExport;
