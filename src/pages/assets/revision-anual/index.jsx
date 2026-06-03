import { useState, useEffect } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-ACT-08 — Revisión anual de vida útil y valor residual (cambio de estimación).
 *
 * Pantalla que expone el flujo de revisión anual NIC 16 §51 / NIC 8 (cambio de
 * estimación contable) que ya existía en backend (NiifAlertsController:
 * GET /api/v1/niif-alerts/annual-review/assets y POST /api/v1/niif-alerts/annual-review)
 * pero no tenía acceso en la interfaz.
 *
 * Permite al contador:
 *  - cargar los activos elegibles de un año fiscal (vida útil, valor residual,
 *    valor en libros y depreciación mensual vigentes);
 *  - registrar la revisión de cada activo confirmando o cambiando la vida útil
 *    y/o el valor residual, con justificación. Si cambia, el backend recalcula
 *    la depreciación prospectiva (no retroactiva).
 */

const fmtMoney = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
        .format(Number(v));
};

const RevisionAnualIndex = () => {
    const currentYear = new Date().getFullYear();
    const [fiscalYear, setFiscalYear] = useState(currentYear);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '', show: false });

    const showMsg = (type, text) => setMessage({ type, text, show: true });

    /** GET activos elegibles para revisión del año fiscal. */
    const loadAssets = async () => {
        // QA Activos (2026-06-02): la revisión anual NIC 16 §51 aplica al año en
        // curso o a años anteriores (cierre fiscal). No tiene sentido revisar un
        // año futuro porque la depreciación de ese periodo aún no ha ocurrido. El
        // backend ya devuelve lista vacía para años futuros; aquí lo explicamos
        // de forma explícita para que el contador no crea que "no filtra".
        if (Number(fiscalYear) > currentYear) {
            setAssets([]);
            setLoaded(true);
            showMsg('warning',
                `No se puede revisar un año fiscal futuro (${Number(fiscalYear)}). `
                + `La revisión anual aplica al año en curso (${currentYear}) o a años anteriores.`);
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '', show: false });
        try {
            const url = base_url(['api', 'v1', 'niif-alerts', 'annual-review', 'assets'])
                + '?fiscalYear=' + Number(fiscalYear);
            const resp = await fetchHelper.get(url, {}, 0);
            const data = resp?.data ?? resp ?? [];
            setAssets(Array.isArray(data) ? data : []);
            setLoaded(true);
        } catch (err) {
            console.error('Error cargando activos para revisión anual:', err);
            showMsg('danger', err?.message || err?.msg || 'No se pudieron cargar los activos para revisión anual.');
            setAssets([]);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    /** Abre el formulario de revisión (SweetAlert) y registra el POST. */
    const openReview = (asset) => {
        const ulActual = asset.usefulLifeMonths ?? '';
        const rvActual = asset.residualValue ?? 0;
        window.Swal.fire({
            title: `Revisión anual — ${asset.code || ('#' + asset.id)}`,
            width: 620,
            html: `
                <div class="text-start">
                  <p class="mb-2" style="font-size:0.85rem">
                    <strong>${asset.name || ''}</strong><br/>
                    <span class="text-muted">Valor en libros actual: ${fmtMoney(asset.currentBookValue)} ·
                    Depreciación mensual actual: ${fmtMoney(asset.depreciationMonthly)}</span>
                  </p>
                  <label class="form-label mb-1" style="font-size:0.82rem">Vida útil (meses)</label>
                  <input id="swal-ul" type="number" min="1" class="form-control mb-2" value="${ulActual}" />
                  <label class="form-label mb-1" style="font-size:0.82rem">Valor residual</label>
                  <input id="swal-rv" type="number" min="0" step="any" class="form-control mb-2" value="${rvActual}" />
                  <label class="form-label mb-1" style="font-size:0.82rem">Justificación de la revisión *</label>
                  <textarea id="swal-just" rows="3" class="form-control"
                    placeholder="Motivo del cambio de estimación o confirmación (NIC 8). Mínimo 10 caracteres."></textarea>
                  <small class="text-muted d-block mt-1" style="font-size:0.74rem">
                    Si cambia la vida útil o el valor residual, la depreciación se recalcula de forma
                    prospectiva (no se modifican periodos anteriores).
                  </small>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Registrar revisión',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const ul = document.getElementById('swal-ul').value;
                const rv = document.getElementById('swal-rv').value;
                const just = (document.getElementById('swal-just').value || '').trim();
                if (just.length < 10) {
                    window.Swal.showValidationMessage('La justificación debe tener al menos 10 caracteres.');
                    return false;
                }
                if (ul !== '' && Number(ul) <= 0) {
                    window.Swal.showValidationMessage('La vida útil debe ser un número de meses mayor a cero.');
                    return false;
                }
                if (rv !== '' && Number(rv) < 0) {
                    window.Swal.showValidationMessage('El valor residual no puede ser negativo.');
                    return false;
                }
                return {
                    newUsefulLife: ul === '' ? null : Number(ul),
                    newResidualValue: rv === '' ? null : Number(rv),
                    justification: just,
                };
            },
        }).then(async (res) => {
            if (!res.isConfirmed) return;
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'niif-alerts', 'annual-review']),
                    {
                        assetId: asset.id,
                        fiscalYear: Number(fiscalYear),
                        newUsefulLife: res.value.newUsefulLife,
                        newResidualValue: res.value.newResidualValue,
                        justification: res.value.justification,
                    }, {}, 10000);
                // El backend responde { data: { message, review: { ...DTO } } }.
                // El DTO real está en data.review; si en el futuro viniera plano,
                // el fallback lo cubre.
                const payload = resp?.data ?? resp ?? {};
                const dto = payload.review ?? payload;
                const tipo = dto.reviewType || 'REGISTRADA';
                window.Swal.fire({
                    icon: 'success',
                    title: 'Revisión anual registrada',
                    width: 640,
                    html: `<div class="text-start" style="font-size:0.85rem">
                        <p class="mb-1"><strong>Activo:</strong> ${dto.assetCode || asset.code || ''} — ${dto.assetName || asset.name || ''}</p>
                        <p class="mb-1"><strong>Tipo de revisión:</strong> <span class="badge bg-label-info">${tipo}</span></p>
                        <table class="table table-sm table-bordered mt-2 mb-0" style="font-size:0.8rem">
                          <thead class="table-light"><tr><th></th><th>Anterior</th><th>Nuevo</th></tr></thead>
                          <tbody>
                            <tr><td>Vida útil (meses)</td><td>${dto.previousUsefulLife ?? '-'}</td><td>${dto.newUsefulLife ?? '-'}</td></tr>
                            <tr><td>Valor residual</td><td>${fmtMoney(dto.previousResidualValue)}</td><td>${fmtMoney(dto.newResidualValue)}</td></tr>
                            <tr><td>Depreciación mensual</td><td>${fmtMoney(dto.previousDepreciationMonthly)}</td><td>${fmtMoney(dto.newDepreciationMonthly)}</td></tr>
                          </tbody>
                        </table>
                      </div>`,
                    confirmButtonText: 'Cerrar',
                });
                loadAssets();
            } catch (err) {
                console.error('Error registrando revisión anual:', err);
                window.Swal.fire({
                    icon: 'error',
                    title: 'No se pudo registrar la revisión',
                    text: err?.message || err?.msg || 'Intente nuevamente.',
                });
            }
        });
    };

    useEffect(() => { loadAssets(); }, []); // carga inicial con el año actual

    return (
        <div className="col-12">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title fw-bold mb-1">Revisión anual de vida útil y valor residual</h5>
                    <p className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>
                        Revisión anual de la estimación contable de los activos fijos (NIC 16 §51 / NIC 8).
                        Confirme o ajuste la vida útil y el valor residual de cada activo; los cambios se aplican
                        de forma prospectiva.
                    </p>

                    <AlertPage type={message.type || 'danger'} message={message.text} show={message.show}
                        onChange={() => setMessage({ ...message, show: false })} />

                    <div className="row g-2 align-items-end mb-3">
                        <div className="col-auto">
                            <label className="form-label mb-1" style={{ fontSize: '0.82rem' }}>Año fiscal</label>
                            <input type="number" className="form-control" style={{ maxWidth: 140 }}
                                value={fiscalYear} min="2000" max={currentYear}
                                onChange={(e) => setFiscalYear(e.target.value)} />
                        </div>
                        <div className="col-auto">
                            <button className="btn btn-primary" onClick={loadAssets} disabled={loading}>
                                {loading
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" />Cargando...</>
                                    : <><i className="ri-refresh-line me-1" />Cargar activos</>}
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th className="text-end">Vida útil (meses)</th>
                                    <th className="text-end">Valor residual</th>
                                    <th className="text-end">Valor en libros</th>
                                    <th className="text-end">Deprec. mensual</th>
                                    <th className="text-center">Revisado {fiscalYear}</th>
                                    <th className="text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.length === 0 && (
                                    <tr><td colSpan="8" className="text-center text-muted py-3">
                                        {loaded ? 'No existen activos registrados en este año fiscal.' : 'Cargue los activos del año fiscal.'}
                                    </td></tr>
                                )}
                                {assets.map((a) => (
                                    <tr key={a.id}>
                                        <td><code>{a.code || a.id}</code></td>
                                        <td>{a.name || '-'}</td>
                                        <td className="text-end">{a.usefulLifeMonths ?? '-'}</td>
                                        <td className="text-end">{fmtMoney(a.residualValue)}</td>
                                        <td className="text-end">{fmtMoney(a.currentBookValue)}</td>
                                        <td className="text-end">{fmtMoney(a.depreciationMonthly)}</td>
                                        <td className="text-center">
                                            {a.reviewedThisYear
                                                ? <span className="badge bg-label-success">Revisado</span>
                                                : <span className="badge bg-label-secondary">Pendiente</span>}
                                        </td>
                                        <td className="text-center">
                                            <button className="btn btn-sm btn-label-primary"
                                                onClick={() => openReview(a)}
                                                title="Registrar revisión anual">
                                                <i className="ri-calendar-check-line me-1" />
                                                {a.reviewedThisYear ? 'Revisar de nuevo' : 'Revisar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevisionAnualIndex;
