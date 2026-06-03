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
            // QA Auditoria (2026-06-02): rate limit (429) -> mostrar el mensaje
            // del backend, no un error generico. El tope nunca es silencioso.
            if (resp.status === 429) {
                const j = await resp.json().catch(() => ({}));
                setAlert({ show: true, type: 'warning',
                    message: j.message || 'Ha alcanzado el limite de exportaciones. Espere unos segundos.' });
                return;
            }
            if (!resp.ok) {
                const text = await resp.text();
                let msg; try { msg = JSON.parse(text)?.message; } catch { msg = text; }
                setAlert({ show: true, type: 'danger',
                    message: msg || 'No se pudo generar el reporte' });
                return;
            }
            // HU-AU-08 E7 / tope N (2026-06-02): el backend responde 200 con JSON
            // {success:false, message} cuando no hay registros o se supera el tope.
            // No hay que descargar un archivo basura: mostrar el mensaje.
            const ctype = resp.headers.get('content-type') || '';
            if (ctype.includes('application/json')) {
                const j = await resp.json().catch(() => ({}));
                setAlert({ show: true, type: 'warning',
                    message: j.message || 'No se encontraron registros para los parametros seleccionados' });
                return;
            }
            const blob = await resp.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            // HU-AU-06 E1: el backend genera PDF real (iText). Antes el front forzaba
            // la extension .txt para PDF (residuo del stub de texto), por eso el
            // archivo se descargaba como .txt. Usar la extension real del formato.
            a.download = `audit-logs.${format}`;
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
                    El evento de exportación queda registrado automáticamente en el log de auditoría.
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
