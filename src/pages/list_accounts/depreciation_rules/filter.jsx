import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

// ─── Constantes ────────────────────────────────────────────────────────────────
// QA Listas Contables (2026-06-02): los ids deben ser los enum REALES del backend
// (DECREASING, MINIMUN_USEFUL_LIFE), no DECLINING_BALANCE / MINIMUM_USEFUL_LIFE.
// Antes el filtro mandaba valores que no existian en el enum -> 0 coincidencias /
// filtro ignorado.
const DEPRECIATION_TYPES = [
    { id: 'LINEAR', name: 'Lineal' },
    { id: 'DECREASING', name: 'Decreciente' },
    { id: 'ACCELERATED', name: 'Acelerada' },
    { id: 'PRODUCTION_UNITS', name: 'Unidades de producción' },
    { id: 'MINIMUN_USEFUL_LIFE', name: 'Vida útil mínima' },
];

const RULE_STATUSES = [
    { id: 'ACTIVE', name: 'Activa' },
    { id: 'INACTIVE', name: 'Inactiva' },
];

// ─── Componente ─────────────────────────────────────────────────────────────────
const FilterDepreciationRule = ({ filterRef, filterInstance, dataTableRef }) => {

    const getTable = () => dataTableRef?.current?.table();

    // QA Listas Contables (2026-06-02): el selector usa el atributo REAL de la
    // entidad. Antes 'depreciationType' / 'accountName' no resolvian y el filtro
    // se descartaba en silencio (mostraba todas las reglas). El de cuenta filtra
    // por la relacion accountingAccount.id (dropdown de cuentas, no texto libre).
    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'name:name' },
        { regex: false, value: '', column: 'depretationType:name' },
        { regex: false, value: '', column: 'accountingAccount.id:name' },
        { regex: true, value: '', column: 'status:name' },
        { regex: false, value: '', column: 'effectiveDate:name' },
    ]);

    // QA Listas Contables (2026-06-02): el filtro de cuenta contable es ahora un
    // checklist (multi-select) de cuentas 14xx/15xx/16xx, no un campo de texto.
    const [accounts, setAccounts] = useState([]);
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const url = base_url(['api', 'v1', 'accounting-accounts']);
                const response = await fetchHelper.post(url, {
                    length: -1,
                    columns: [{ data: 'status', search: { value: 'ACTIVE', regex: false } }]
                }, {}, 0);
                const list = response?.content ?? response?.data ?? [];
                const filtered = list.filter(a => {
                    const code = String(a.pucAccount?.code ?? '');
                    return code.startsWith('14') || code.startsWith('15') || code.startsWith('16');
                });
                setAccounts(filtered.map(a => ({
                    id: String(a.id),
                    name: a.customName || `${a.pucAccount?.name ?? ''} (${a.pucAccount?.code ?? ''})`
                })));
            } catch (err) {
                console.error('Error al cargar cuentas contables:', err);
            }
        };
        loadAccounts();
    }, []);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(filter => {
            table.column(filter.column).search(filter.value, filter.regex, false);
        });
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
        <>
            <div className="modal fade" ref={filterRef} id="modalFilterDepreciationRule" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Filtrar Reglas de Depreciación</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                        </div>

                        <div className="modal-body">

                            {/* Nombre */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('name:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('name:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputModal
                                            type="text"
                                            id="dr_filter_name"
                                            label="Nombre de la regla"
                                            value={getFilter('name:name')?.value || ''}
                                            onChange={(e) => updateFilter('name:name', 'value', e.target.value)}
                                            placeholder="Buscar por nombre"
                                            error=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tipo de depreciación */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <InputSelectModal
                                        id="dr_filter_depreciationType"
                                        label="Tipo de depreciación"
                                        options={DEPRECIATION_TYPES}
                                        value={selectValue('depretationType:name')}
                                        onChange={(value) => updateFilter('depretationType:name', 'value', value.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            {/* Cuenta contable (checklist) */}
                            <div className="row">
                                <div className="col-md-12 mb-4 mt-2">
                                    <InputSelectModal
                                        id="dr_filter_account"
                                        label="Cuenta contable"
                                        options={accounts}
                                        value={selectValue('accountingAccount.id:name')}
                                        onChange={(value) => updateFilter('accountingAccount.id:name', 'value', value.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            {/* Fecha de vigencia + Estado */}
                            <div className="row">
                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <InputModal
                                            type="date"
                                            id="dr_filter_effectiveDate"
                                            label="Fecha de vigencia"
                                            value={getFilter('effectiveDate:name')?.value || ''}
                                            onChange={(e) => updateFilter('effectiveDate:name', 'value', e.target.value)}
                                            placeholder="DD/MM/AAAA"
                                            error=""
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6 mb-4 mt-2">
                                    <div className="input-group">
                                        <div className="input-group-text form-check mb-0">
                                            <input
                                                checked={getFilter('status:name')?.regex || false}
                                                className="form-check-input m-auto"
                                                type="checkbox"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                data-bs-original-title="Búsqueda por coincidencia"
                                                onChange={(e) => updateFilter('status:name', 'regex', e.target.checked)}
                                                disabled={!dataTableRef?.current}
                                                aria-label="Buscar"
                                            />
                                        </div>
                                        <InputSelectModal
                                            id="dr_filter_status"
                                            label="Estado de la regla"
                                            options={RULE_STATUSES}
                                            value={selectValue('status:name')}
                                            onChange={(value) => updateFilter('status:name', 'value', value.join(','))}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>{/* /modal-body */}

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    getTable().draw();
                                    filterInstance?.current?.hide();
                                }}
                            >
                                Filtrar
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => {
                                    getTable().columns().search('');
                                    getTable().search('');
                                    getTable().draw();
                                    setFilters(prev => prev.map(f => ({ ...f, value: '' })));
                                }}
                            >
                                Limpiar
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FilterDepreciationRule;
