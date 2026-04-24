import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

// AccountFilterRequest fields — filters are applied server-side via POST /api/v1/accounting-accounts
// Fields: custom_name, base_currency, puc_id, cost_center_id, depreciation_rule_id, nature, status

const NATURE_OPTIONS = [
    { id: 'DEBIT',  label: 'Deudora' },
    { id: 'CREDIT', label: 'Acreedora' },
];

const STATUS_OPTIONS = [
    { id: 'ACTIVE',   label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
];

const FilterCuentaContable = ({
    filterRef,
    filterInstance,
    dataTableRef
}) => {

    const getTable = () => dataTableRef?.current?.table();

    const [pucs, setPucs] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [costCenters, setCostCenters] = useState([]);

    useEffect(() => {
        const dtBody = { length: -1, columns: [{data:'status', search: {value: 'ACTIVE', regex: false}}] };
        const loadData = async () => {
            // Promise.allSettled: a 403 on one endpoint won't block the others
            const [pucRes, currRes, ccRes] = await Promise.allSettled([
                fetchHelper.post(base_url(['api', 'v1', 'chart-of-accounts', 'search']), {dtBody}, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']), dtBody, {}, 0),
                // fetchHelper.post(base_url(['api', 'v1', 'depreciation-rules', 'search']), dtBody, {}, 0),
            ]);
            if (pucRes.status === 'fulfilled')  setPucs(pucRes.value.data || []);
            if (currRes.status === 'fulfilled') setCurrencies(currRes.value.data || []);
            if (ccRes.status === 'fulfilled')   setCostCenters(ccRes.value.data || []);
            // if (drRes.status === 'fulfilled')   setDepreciationRules(drRes.value.data || []);
            const failed = [pucRes, currRes, ccRes].filter(r => r.status === 'rejected');
            if (failed.length) console.warn('Algunos datos no pudieron cargarse:', failed.map(f => f.reason));

            console.log(pucs, currencies, costCenters);

        };
        loadData();
    }, []);

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'pucAccount:name' },
        { regex: true, value: '', column: 'customName:name' },
        { regex: true, value: '', column: 'baseCurrency:name' },
        { regex: true, value: '', column: 'costCenterName:name' },
        { regex: true, value: '', column: 'nature:name' },
        { regex: true, value: '', column: 'status:name' },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(filter => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
        console.log(table)
    }, [filters]);

    const getFilter = (column) => filters.find(f => f.column === column);

    const updateFilter = (column, key, value) => {
        setFilters(prev => prev.map(f =>
            f.column === column ? { ...f, [key]: value } : f
        ));
    };

    const selectValue = (column) => {
        const val = getFilter(column)?.value;
        return val === '' ? [] : val.split(',');
    };

    return (
        <div className="modal fade" ref={filterRef} id="filterCuentasContables" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="filterCuentasContablesTitle">Filtrar Cuentas Contables</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>
                    <div className="modal-body">

                        {/* Nombre Personalizado — AccountFilterRequest.custom_name */}
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('customName:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-original-title="Búsqueda por coincidencia"
                                            onChange={(e) => updateFilter('customName:name', 'regex', e.target.checked)}
                                            disabled={!dataTableRef?.current}
                                            aria-label="Buscar"
                                        />
                                    </div>

                                    <InputModal
                                        type="text"
                                        id="filter_custom_name"
                                        label="Nombre Personalizado"
                                        value={getFilter('customName:name')?.value || ''}
                                        onChange={(e) => updateFilter('customName:name', 'value', e.target.value)}
                                        placeholder="Ej: Caja general"
                                        error=""
                                    />
                                </div>
                            </div>
                            {/* Moneda Base — AccountFilterRequest.base_currency */}
                            <div className="col-12 mt-3">
                                <div className="input-group">

                                    <InputSelectModal
                                        id="filter_base_currency"
                                        label="Moneda Base"
                                        value={getFilter('baseCurrency:name')?.value?.split(',') || []}
                                        onChange={(value) => updateFilter('baseCurrency:name', 'value', value.filter(v => v !== '').join(','))}
                                        placeholder="Seleccionar moneda base"
                                        options={currencies.map(c => ({ id: c.name, name: c.name }))}
                                        multiple={true}
                                    />
                                </div>
                            </div>
                        </div>

                        

                        {/* Naturaleza — AccountFilterRequest.nature */}
                        <div className="row mb-3">

                            {/* Código PUC — AccountFilterRequest.puc_id */}
                            <div className="col-12 mt-3">
                                <InputSelectModal
                                    id="filter_puc_id"
                                    label="Código PUC"
                                    value={getFilter('pucAccount:name')?.value?.split(',') || []}
                                    onChange={(value) => updateFilter('pucAccount:name', 'value', value.filter(v => v !== '').join(','))}
                                    placeholder="Seleccionar código PUC"
                                    options={pucs.map(p => ({ id: p.code, name: p.code }))}
                                    multiple={true}
                                />
                            </div>

                            <div className="col-12 mt-3">
                                <InputSelectModal
                                    id="filter_nature"
                                    label="Naturaleza"
                                    value={getFilter('nature:name')?.value?.split(',') || []}
                                    onChange={(value) => updateFilter('nature:name', 'value', value.filter(v => v !== '').join(','))}
                                    placeholder="Seleccionar naturaleza"
                                    options={NATURE_OPTIONS}
                                    multiple={true}
                                />
                            </div>
                        </div>

                        {/* Estado — AccountFilterRequest.status */}
                        <div className="row mb-3">
                            {/* Centros de costos */}
                            <div className="col-12 mt-3">
                                <InputSelectModal
                                    id="filter_cost_center_id"
                                    label="Centro de Costos"
                                    value={getFilter('costCenterName:name')?.value?.split(',') || []}
                                    onChange={(value) => updateFilter('costCenterName:name', 'value', value.filter(v => v !== '').join(','))}
                                    placeholder="Seleccionar centro de costos"
                                    options={costCenters.map(c => ({ id: c.name, name: c.name }))}
                                    multiple={true}
                                />
                            </div>
                            <div className="col-12 mt-3">
                                <InputSelectModal
                                    id="filter_status"
                                    label="Estado"
                                    value={getFilter('status:name')?.value?.split(',') || []}
                                    onChange={(value) => updateFilter('status:name', 'value', value.filter(v => v !== '').join(','))}
                                    placeholder="Seleccionar estado"
                                    options={STATUS_OPTIONS}
                                    multiple={true}
                                />
                            </div>
                        </div>

                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setFilters(prev => prev.map(f => ({ ...f, value: '', regex: true })));
                                dataTableRef?.current?.ajax.reload();
                            }}>
                            Limpiar Filtros
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                dataTableRef?.current?.ajax.reload();
                                filterInstance?.current?.hide();
                            }}>
                            Buscar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterCuentaContable;
