import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';

import CreateApAdvance from './create';
import ApplyApAdvance from './apply';

import { statusBadge, traducir } from '../../../utils/statusLabels';
/**
 * Pagina principal de Anticipos a Proveedores (Cuentas por Pagar).
 * Muestra un listado paginado y permite registrar y aplicar anticipos.
 *
 * QA-BLOQUE-AO (2026-04-29): refactor del flujo "Aplicar a Factura":
 *  - Antes: el filter de status pedia AVAILABLE/PARTIALLY_APPLIED, pero el
 *    backend usa PENDING/APPLIED. Resultado: boton apply siempre deshabilitado.
 *  - El handler abria un Swal con input numerico de ID factura (no usable).
 *  - Ahora: status mapeado a PENDING/APPLIED + modal con dropdown de facturas
 *    de compra pendientes del proveedor (similar a AR cobros/anticipos).
 */

const STATUS_BADGE = {
    PENDING: 'bg-label-success',
    APPLIED: 'bg-label-info',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    PENDING: 'Pendiente',
    APPLIED: 'Aplicado',
    REVERSED: 'Reversado',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApAdvances = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalApplyRef = useRef(null);
    const modalApplyInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedAdvance, setSelectedAdvance] = useState(null);

    const url = ['api', 'v1', 'ap', 'advances'];

    // QA CXP item 5 (2026-06-02): gating de permisos (backend ya bloquea via
    // @PreAuthorize). Crear y aplicar anticipo requieren AP.ANTICIPOS.CREAR.
    const { has } = usePermissions();
    const canCreate = has('AP.ANTICIPOS.CREAR');

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            // QA-BLOQUE-AO (2026-04-29): path JPA real para filter modal.
            name: 'thirdParty.businessName',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        {
            // AP-RF-05 E6 (Bloque DV): disponible del anticipo (puede aplicarse a varias facturas).
            title: 'Disponible',
            data: 'availableAmount',
            name: 'availableAmount',
            searchable: false,
            render: (val, _t, row) => formatCurrency(val != null ? val
                : (Number(row?.amount || 0) - Number(row?.appliedAmount || 0))),
        },
        { title: 'Fecha', data: 'advanceDate', name: 'advanceDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                return statusBadge(val);
            },
        },
        {
            title: 'Factura Aplicada',
            data: 'appliedInvoiceId',
            name: 'appliedInvoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                // AP-RF-05 E6/E7 (Bloque DV):
                //  - aplicar: mientras haya disponible (PENDING o PARTIALLY_APPLIED).
                //  - revertir aplicacion: si hay aplicaciones (APPLIED o PARTIALLY_APPLIED).
                //  - anular: solo PENDING (sin aplicaciones).
                const available = row?.availableAmount != null
                    ? Number(row.availableAmount)
                    : (Number(row?.amount || 0) - Number(row?.appliedAmount || 0));
                const st = row?.status;
                const canApply = (st === 'PENDING' || st === 'PARTIALLY_APPLIED') && available > 0;
                const hasApplications = st === 'APPLIED' || st === 'PARTIALLY_APPLIED';
                const canVoid = st === 'PENDING';
                const btns = [`<button class="btn btn-sm btn-label-info action-btn" data-action="view" data-id="${id}" title="Ver"><i class="ri-eye-line"></i></button>`];
                if (canCreate && canApply) btns.push(`<button class="btn btn-sm btn-label-success action-btn" data-action="apply" data-id="${id}" title="Aplicar a Factura"><i class="ri-links-line"></i></button>`);
                if (canCreate && hasApplications) btns.push(`<button class="btn btn-sm btn-label-warning action-btn" data-action="reverse" data-id="${id}" title="Revertir aplicacion"><i class="ri-arrow-go-back-line"></i></button>`);
                if (canCreate && canVoid) btns.push(`<button class="btn btn-sm btn-label-danger action-btn" data-action="void" data-id="${id}" title="Anular anticipo"><i class="ri-close-circle-line"></i></button>`);
                return `<div class="d-flex gap-1">${btns.join('')}</div>`;
            },
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
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
        ...(canCreate ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Anticipo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        }] : []),
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /**
     * QA-BLOQUE-AO (2026-04-29): abre el modal dedicado con dropdown de
     * facturas de compra pendientes en lugar de un Swal con input numerico.
     */
    const openModalApply = (advance) => {
        setSelectedAdvance(advance);
        if (!modalApplyInstance.current) {
            modalApplyInstance.current = new window.bootstrap.Modal(modalApplyRef.current);
        }
        modalApplyInstance.current.show();
    };

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = async function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            const available = selected.availableAmount != null
                ? Number(selected.availableAmount)
                : (Number(selected.amount || 0) - Number(selected.appliedAmount || 0));

            if (action === 'view') {
                // AP-RF-05 E6: el detalle muestra disponible + las aplicaciones a facturas.
                let appsHtml = '';
                try {
                    const res = await fetchHelper.get(base_url(['api', 'v1', 'ap', 'advances', id, 'applications']), {}, 0);
                    const apps = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
                    if (apps.length) {
                        appsHtml = '<hr/><p class="mb-1"><strong>Aplicaciones:</strong></p>'
                            + '<table class="table table-sm"><thead><tr><th>Factura</th><th>Monto</th><th>Estado</th></tr></thead><tbody>'
                            + apps.map(a => `<tr><td>${a.invoiceNumber || ('#' + a.invoiceId)}</td><td>${formatCurrency(a.amount)}</td><td>${a.status === 'ACTIVE' ? 'Activa' : 'Revertida'}</td></tr>`).join('')
                            + '</tbody></table>';
                    } else {
                        appsHtml = '<hr/><p class="text-muted mb-0">Sin aplicaciones registradas.</p>';
                    }
                } catch (e) { /* tolerante */ }
                window.Swal.fire({
                    title: `Anticipo #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Proveedor:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Disponible:</strong> ${formatCurrency(available)}</p>
                            <p><strong>Fecha:</strong> ${selected.advanceDate || '-'}</p>
                            <p><strong>Estado:</strong> ${traducir(selected.status)}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                            ${appsHtml}
                        </div>`,
                    width: 560,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'apply') {
                openModalApply(selected);
                return;
            }

            // AP-RF-05 E7: anular anticipo PENDIENTE (motivo >= 10).
            if (action === 'void') {
                const r = await window.Swal.fire({
                    title: '¿Anular anticipo?',
                    html: `<p class="text-start mb-2">Se reversará el asiento contable y se liberarán los fondos del anticipo ${formatCurrency(selected.amount)} a <strong>${selected.thirdPartyName || '-'}</strong>.</p>`,
                    input: 'textarea',
                    inputLabel: 'Motivo de anulación (mínimo 10 caracteres)',
                    inputAttributes: { maxlength: 500 },
                    showCancelButton: true,
                    confirmButtonText: 'Anular',
                    cancelButtonText: 'Cancelar',
                    inputValidator: (v) => (!v || v.trim().length < 10)
                        ? 'El motivo es obligatorio y debe tener al menos 10 caracteres' : undefined,
                });
                if (!r.isConfirmed) return;
                try {
                    await fetchHelper.post(base_url(['api', 'v1', 'ap', 'advances', id, 'void']), { reason: r.value }, {}, 1000);
                    dataTableRef?.current?.ajax.reload(null, false);
                    setMessage({ type: 'success', show: true, message: 'Anticipo anulado correctamente; fondos liberados.' });
                } catch (e) {
                    setMessage({ type: 'danger', show: true, message: e?.msg || 'No se pudo anular el anticipo.' });
                }
                return;
            }

            // AP-RF-05 E7: revertir una aplicacion sobre su factura destino.
            if (action === 'reverse') {
                let apps = [];
                try {
                    const res = await fetchHelper.get(base_url(['api', 'v1', 'ap', 'advances', id, 'applications']), {}, 0);
                    const all = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
                    apps = all.filter(a => a.status === 'ACTIVE');
                } catch (e) { /* */ }
                if (!apps.length) {
                    setMessage({ type: 'warning', show: true, message: 'No hay aplicaciones activas para revertir.' });
                    return;
                }
                const optionsHtml = apps.map(a => `<option value="${a.id}">${a.invoiceNumber || ('Factura #' + a.invoiceId)} — ${formatCurrency(a.amount)}</option>`).join('');
                const r = await window.Swal.fire({
                    title: 'Revertir aplicación',
                    html: `
                        <div class="text-start">
                            <label class="form-label">Aplicación a revertir</label>
                            <select id="rev_app_sel" class="form-select mb-3">${optionsHtml}</select>
                            <label class="form-label">Motivo (opcional)</label>
                            <textarea id="rev_app_reason" class="form-control" maxlength="500" rows="3"></textarea>
                        </div>`,
                    showCancelButton: true,
                    confirmButtonText: 'Revertir',
                    cancelButtonText: 'Cancelar',
                    preConfirm: () => ({
                        appId: document.getElementById('rev_app_sel')?.value,
                        reason: document.getElementById('rev_app_reason')?.value || '',
                    }),
                });
                if (!r.isConfirmed || !r.value?.appId) return;
                try {
                    await fetchHelper.post(
                        base_url(['api', 'v1', 'ap', 'advances', id, 'applications', r.value.appId, 'reverse']),
                        { reason: r.value.reason }, {}, 1000);
                    dataTableRef?.current?.ajax.reload(null, false);
                    setMessage({ type: 'success', show: true, message: 'Aplicación revertida; saldo de la factura restaurado.' });
                } catch (e) {
                    setMessage({ type: 'danger', show: true, message: e?.msg || 'No se pudo revertir la aplicación.' });
                }
                return;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Anticipos a Proveedores</h5>

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
                        title="Anticipos a Proveedores"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApAdvance
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <ApplyApAdvance
                modalRef={modalApplyRef}
                modalInstance={modalApplyInstance}
                dataTableRef={dataTableRef}
                advance={selectedAdvance}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Anticipos a Proveedores"
                columns={[
                    { column: 'thirdPartyName:name', label: 'Proveedor' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'advanceDate:name', label: 'Fecha', type: 'date' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'PARTIALLY_APPLIED', label: 'Parcialmente Aplicado' },
                        { id: 'APPLIED', label: 'Aplicado' },
                        { id: 'CANCELLED', label: 'Anulado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApAdvances;
