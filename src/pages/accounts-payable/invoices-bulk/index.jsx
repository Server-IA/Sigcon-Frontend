import { useState } from 'react';

import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-AP-23 (2026-04-28): Carga masiva de Facturas de Compra.
 *
 * Sube un archivo CSV/TXT codificado en Base64 al endpoint
 * POST /api/v1/invoices/bulk/store. El backend procesa fila por
 * fila y devuelve un resumen con totales y errores individuales.
 *
 * Formato CSV requerido (sin encabezado de columnas, separado por coma):
 *   thirdPartyId,paymentFormId,resolutionInvoice,invoiceDate,invoiceDueDay,supplierInvoiceNumber?,notes?
 *
 * Ejemplo:
 *   1,1,RES-100,2026-04-15,30,FAC-PROV-001,Compra mensual papeleria
 */

const TEMPLATE_HEADERS = [
    'thirdPartyId',
    'paymentFormId',
    'resolutionInvoice',
    'invoiceDate',
    'invoiceDueDay',
    'supplierInvoiceNumber',
    'notes',
];

const SAMPLE_ROW = '1,1,RES-100,2026-04-15,30,FAC-PROV-001,Compra mensual papeleria';

const IndexInvoicesBulk = () => {
    const [file, setFile] = useState(null);
    const [delimiter, setDelimiter] = useState(',');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Descarga plantilla CSV vacia con header + ejemplo. */
    const downloadTemplate = () => {
        const content = '﻿' + TEMPLATE_HEADERS.join(',') + '\n' + SAMPLE_ROW + '\n';
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_facturas_compra.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) {
            setFile(null);
            return;
        }
        const valid = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        if (!valid.includes(f.type) && !f.name.toLowerCase().match(/\.(csv|txt)$/)) {
            setMessage({ type: 'danger', show: true,
                message: 'Solo se aceptan archivos CSV o TXT.' });
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            setMessage({ type: 'danger', show: true,
                message: 'El archivo supera el limite de 5MB.' });
            return;
        }
        setFile(f);
    };

    /** Lee el archivo, lo encodea a base64 y lo envia al backend. */
    const handleUpload = async () => {
        if (!file) {
            setMessage({ type: 'warning', show: true, message: 'Seleccione un archivo CSV.' });
            return;
        }
        try {
            setLoading(true);
            setResult(null);

            const fileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    // result = "data:text/csv;base64,XXXX..."
                    const base64 = String(result).split(',')[1] || '';
                    resolve(base64);
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });

            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'invoices', 'bulk', 'store']),
                { fileBase64, delimiter: delimiter || ',' },
                {},
                0
            );
            const data = response?.data ?? response;
            setResult(data);

            const errorCount = data?.errorCount ?? 0;
            const successCount = data?.successCount ?? 0;
            if (errorCount > 0 && successCount > 0) {
                setMessage({ type: 'warning', show: true,
                    message: `Importacion parcial: ${successCount} OK, ${errorCount} con error.` });
            } else if (errorCount > 0) {
                setMessage({ type: 'danger', show: true,
                    message: `Importacion fallida: ${errorCount} filas con error.` });
            } else {
                setMessage({ type: 'success', show: true,
                    message: `${successCount} facturas importadas exitosamente.` });
            }
        } catch (error) {
            setMessage({ type: 'danger', show: true,
                message: error?.msg || error?.message || 'Error al importar el archivo.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setResult(null);
        const input = document.getElementById('bulk_invoice_file_input');
        if (input) input.value = '';
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">
                <i className="ri-upload-cloud-2-line me-2" />Carga Masiva de Facturas de Compra
            </h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                <div className="alert alert-info">
                    <h6 className="alert-heading mb-2">
                        <i className="ri-information-line me-1" />Instrucciones
                    </h6>
                    <ol className="mb-2 small">
                        <li>Descargue la plantilla CSV haciendo clic en <strong>Descargar plantilla</strong>.</li>
                        <li>Edite el archivo en Excel u otra herramienta. Cada fila representa una factura.</li>
                        <li>Columnas obligatorias: <code>thirdPartyId</code> (id proveedor),
                            <code> paymentFormId</code> (id forma pago),
                            <code> resolutionInvoice</code>, <code>invoiceDate</code> (yyyy-mm-dd),
                            <code> invoiceDueDay</code> (dia mes 1-31).</li>
                        <li>Columnas opcionales: <code>supplierInvoiceNumber</code>, <code>notes</code>.</li>
                        <li>Formato de fecha: <code>yyyy-MM-dd</code> (ej. 2026-04-15).</li>
                        <li>Las filas con error <strong>no detienen el proceso</strong>; se reportan al final.</li>
                    </ol>
                    <button className="btn btn-sm btn-outline-primary" onClick={downloadTemplate}>
                        <i className="ri-download-2-line me-1" />Descargar plantilla
                    </button>
                </div>

                <div className="row g-3 align-items-end mb-3">
                    <div className="col-md-7">
                        <label htmlFor="bulk_invoice_file_input" className="form-label">
                            Archivo CSV / TXT (max 5MB)
                        </label>
                        <input
                            id="bulk_invoice_file_input"
                            type="file"
                            accept=".csv,.txt,text/csv,text/plain"
                            className="form-control"
                            onChange={handleFileChange}
                        />
                        {file && (
                            <small className="text-muted">
                                Archivo seleccionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                            </small>
                        )}
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Separador</label>
                        <select className="form-select"
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}>
                            <option value=",">Coma ( , )</option>
                            <option value=";">Punto y coma ( ; )</option>
                            <option value="\t">Tab</option>
                            <option value="|">Pipe ( | )</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <button className="btn btn-primary w-100"
                            onClick={handleUpload}
                            disabled={loading || !file}>
                            {loading ? 'Procesando...' : 'Importar'}
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="mt-4">
                        <h6 className="mb-3">
                            <i className="ri-check-double-line me-1" />Resultado de la importacion
                        </h6>
                        <div className="row g-2 mb-3">
                            <div className="col-md-4">
                                <div className="card border-primary">
                                    <div className="card-body py-3 text-center">
                                        <h3 className="mb-0">{result.totalRows ?? 0}</h3>
                                        <small className="text-muted">Total filas</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-success">
                                    <div className="card-body py-3 text-center">
                                        <h3 className="mb-0 text-success">{result.successCount ?? 0}</h3>
                                        <small className="text-muted">Importadas</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger">
                                    <div className="card-body py-3 text-center">
                                        <h3 className="mb-0 text-danger">{result.errorCount ?? 0}</h3>
                                        <small className="text-muted">Con error</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(result.errors || []).length > 0 && (
                            <div>
                                <h6 className="mb-2">Errores por fila</h6>
                                <div className="table-responsive">
                                    <table className="table table-bordered table-sm">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: 100 }}># Fila</th>
                                                <th>Mensaje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(result.errors || []).map((e, i) => (
                                                <tr key={i}>
                                                    <td>{e.row}</td>
                                                    <td className="text-danger">{e.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <button className="btn btn-outline-secondary mt-2" onClick={handleClear}>
                            <i className="ri-refresh-line me-1" />Cargar otro archivo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexInvoicesBulk;
