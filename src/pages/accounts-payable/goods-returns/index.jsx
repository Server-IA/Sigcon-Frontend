import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';

/**
 * RF-21/32 (Notas Tecnicas CXP, 2026-06-02): Listado INDEPENDIENTE de Devoluciones
 * de Mercancia (DV-). Antes esta pagina reutilizaba el listado de recepciones; ahora
 * consume el endpoint propio POST /api/v1/ap/returns y muestra cada devolucion con
 * su consecutivo DV-, la recepcion origen (RC-), la fecha y el motivo.
 *
 * El registro de una nueva devolucion sigue partiendo de una recepcion devolvible
 * (RECEIVED, sin factura): el boton "Registrar devolucion" elige primero la
 * recepcion y luego las cantidades por linea (POST /receipts/{id}/return).
 */
const IndexGoodsReturns = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    // RF-21/32: el listado ahora son las DEVOLUCIONES (DV-), no las recepciones.
    const url = ['api', 'v1', 'ap', 'returns'];

    const { has } = usePermissions();
    const canReturnPerm = has('AP.DEVOLUCIONES.CREAR');

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Devolucion',
            data: 'returnNumber',
            name: 'returnNumber',
            render: (val) => val
                ? `<span class="badge bg-label-warning">${val}</span>`
                : '-',
        },
        {
            title: '# Recepcion',
            data: 'receiptNumber',
            name: 'receipt.receiptNumber',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'returnDate', name: 'returnDate', render: (v) => v || '-' },
        {
            title: 'Motivo',
            data: 'reason',
            name: 'reason',
            render: (val) => {
                if (!val) return '-';
                const safe = String(val).replace(/"/g, '&quot;');
                const short = val.length > 60 ? `${val.slice(0, 60)}...` : val;
                return `<span title="${safe}">${short}</span>`;
            },
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn" data-action="view" data-id="${id}" title="Ver detalle">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>`,
        },
    ];

    /** Abre el dialogo de cantidades por linea para devolver una recepcion. */
    const openReturnDialog = async (receiptId, receiptLabel) => {
        let detail = null;
        try {
            const respDet = await fetchHelper.get(
                base_url(['api', 'v1', 'ap', 'receipts', receiptId]), {}, 1000
            );
            detail = respDet?.data || respDet;
        } catch (_) {
            detail = null;
        }
        const lines = Array.isArray(detail?.lines) ? detail.lines : [];
        if (lines.length === 0) {
            setMessage({ type: 'danger', show: true,
                message: 'No se pudieron cargar las lineas de la recepcion.' });
            return;
        }
        const linesHtml = `
            <div class="text-start">
                <p class="small text-muted mb-2">Recepcion: <strong>${receiptLabel || receiptId}</strong></p>
                <label class="form-label small fw-semibold">Motivo (>=20 chars)</label>
                <textarea id="rj_reason" class="form-control mb-3" rows="2" maxlength="500"></textarea>
                <label class="form-label small fw-semibold">Cantidad a devolver por linea</label>
                <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                      <tr><th>Descripcion</th><th class="text-end">Recibido</th>
                      <th class="text-end">Ya devuelto</th><th style="width:100px">A devolver</th></tr>
                    </thead>
                    <tbody>
                    ${lines.map((l) => {
                        const recv = Number(l.quantityReceived || 0);
                        const ret  = Number(l.quantityReturned || 0);
                        const max  = Math.max(0, recv - ret);
                        return `<tr>
                            <td>${l.description || ('Linea #' + l.id)}</td>
                            <td class="text-end">${recv}</td>
                            <td class="text-end">${ret}</td>
                            <td><input type="number" class="form-control form-control-sm rj_qty" data-line="${l.id}" min="0" max="${max}" step="0.01" value="0" /></td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
                <p class="small text-muted mt-2 mb-0">Solo se devuelven lineas con cantidad &gt; 0. Total no puede superar lo pendiente.</p>
            </div>`;
        window.Swal.fire({
            title: 'Registrar devolucion',
            html: linesHtml,
            width: 720,
            showCancelButton: true,
            confirmButtonText: 'Devolver',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ff9f43',
            focusConfirm: false,
            preConfirm: () => {
                const reason = (document.getElementById('rj_reason')?.value || '').trim();
                if (reason.length < 20) {
                    window.Swal.showValidationMessage('El motivo debe tener al menos 20 caracteres');
                    return false;
                }
                const qtyInputs = Array.from(document.querySelectorAll('.rj_qty'));
                const linesPayload = qtyInputs
                    .map((inp) => ({
                        goodsReceiptLineId: Number(inp.dataset.line),
                        quantityReturned: Number(inp.value || 0),
                    }))
                    .filter((l) => l.quantityReturned > 0);
                if (linesPayload.length === 0) {
                    window.Swal.showValidationMessage('Indique al menos una linea con cantidad > 0');
                    return false;
                }
                return {
                    reason,
                    returnDate: new Date().toISOString().slice(0, 10),
                    lines: linesPayload,
                };
            },
        }).then(async ({ isConfirmed, value }) => {
            if (!isConfirmed) return;
            try {
                await fetchHelper.post(
                    base_url(['api', 'v1', 'ap', 'receipts', receiptId, 'return']),
                    value, {}, 1000
                );
                setMessage({ type: 'success', show: true,
                    message: 'Devolucion registrada exitosamente.' });
                dataTableRef?.current?.ajax.reload();
            } catch (error) {
                setMessage({ type: 'danger', show: true,
                    message: error?.msg || error?.message || 'No se pudo registrar la devolucion.' });
            }
        });
    };

    /** Paso 1: elegir una recepcion devolvible (RECEIVED, sin factura). */
    const openRegisterFlow = async () => {
        let options = {};
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'receipts']),
                { start: 0, length: 200, draw: 1, columns: [], order: [], search: { value: '' } },
                {}, 0
            );
            const list = resp?.data || [];
            list
                .filter((r) => r.status === 'RECEIVED'
                    && !(r.linkedInvoiceCount > 0) && !r.invoiceId)
                .forEach((r) => {
                    options[String(r.id)] = `${r.receiptNumber || ('RC #' + r.id)} | OC ${r.purchaseOrderId || '-'} | ${r.receiptDate || ''}`;
                });
        } catch (_) { /* noop */ }
        if (Object.keys(options).length === 0) {
            setMessage({ type: 'warning', show: true,
                message: 'No hay recepciones devolvibles (recibidas y sin factura asociada).' });
            return;
        }
        const result = await window.Swal.fire({
            title: 'Registrar devolucion',
            text: 'Seleccione la recepcion sobre la cual desea devolver mercancia.',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: '-- Seleccione una recepcion --',
            inputValidator: (v) => !v ? 'Debe seleccionar una recepcion' : null,
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        openReturnDialog(Number(result.value), options[result.value]);
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
        ...(canReturnPerm ? [{
            text: '<i class="ri-arrow-go-back-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar devolucion</span>',
            className: 'btn rounded-pill btn-warning waves-effect mx-2 my-2',
            action: () => openRegisterFlow(),
        }] : []),
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            if (action === 'view') {
                const linesHtml = Array.isArray(selected.lines) && selected.lines.length > 0
                    ? `<table class="table table-sm mt-2 mb-0"><thead class="table-light">
                        <tr><th>Linea recepcion</th><th class="text-end">Cantidad devuelta</th></tr></thead>
                        <tbody>${selected.lines.map((l) =>
                            `<tr><td>#${l.goodsReceiptLineId ?? '-'}</td><td class="text-end">${l.quantityReturned ?? '-'}</td></tr>`).join('')}
                        </tbody></table>`
                    : '<p class="small text-muted mb-0">Sin lineas registradas.</p>';
                window.Swal.fire({
                    title: `Devolucion ${selected.returnNumber || ('#' + selected.id)}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Recepcion origen:</strong> ${selected.receiptNumber || selected.receiptId || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.returnDate || '-'}</p>
                            <p><strong>Motivo:</strong> ${selected.reason || '-'}</p>
                            <hr/>
                            <p class="fw-semibold mb-1">Detalle devuelto</p>
                            ${linesHtml}
                        </div>`,
                    width: 600,
                    confirmButtonText: 'Cerrar',
                });
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">
                    <i className="ri-arrow-go-back-line me-2" />Devoluciones de Mercancia
                </h5>
                <div className="card-body pt-0">
                    <p className="text-muted small mb-0">
                        Listado de devoluciones de mercancia (DV-) registradas. Use
                        <strong> Registrar devolucion </strong> para devolver al proveedor una
                        recepcion <strong>recibida que aun NO este vinculada a una factura</strong>.
                        El motivo es obligatorio y queda registrado en auditoria.
                    </p>
                </div>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Devoluciones de Mercancia"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Devoluciones"
                columns={[
                    { column: 'returnNumber:name', label: '# Devolucion' },
                    { column: 'receipt.receiptNumber:name', label: '# Recepcion' },
                    { column: 'returnDate:name', label: 'Fecha', type: 'date' },
                    { column: 'reason:name', label: 'Motivo' },
                ]}
            />
        </>
    );
};

export default IndexGoodsReturns;
