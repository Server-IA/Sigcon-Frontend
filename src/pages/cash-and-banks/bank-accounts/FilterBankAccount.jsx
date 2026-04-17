import { useEffect, useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

/**
 * F-BNK-005-01: Filtros avanzados para cuentas bancarias.
 * Permite filtrar por nombre, banco, tipo cuenta, moneda y estado.
 */
const FilterBankAccount = ({ filterRef, filterInstance, dataTableRef, banks = [], currencies = [] }) => {

    const getTable = () => dataTableRef?.current?.table();

    const ACCOUNT_TYPES = [
        { id: 'SAVINGS', name: 'Ahorros' },
        { id: 'CHECKING', name: 'Corriente' },
        { id: 'INVESTMENT', name: 'Inversión' },
    ];

    const STATUSES = [
        { id: 'ACTIVE', name: 'Activa' },
        { id: 'INACTIVE', name: 'Inactiva' },
        { id: 'SUSPENDED', name: 'Suspendida' },
        { id: 'CLOSED', name: 'Cerrada' },
    ];

    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'accountName:name' },
        { regex: true, value: '', column: 'bank.name:name' },
        { regex: true, value: '', column: 'accountType:name' },
        { regex: true, value: '', column: 'currency.isoCode:name' },
        { regex: true, value: '', column: 'status:name' },
    ]);

    useEffect(() => {
        const table = getTable();
        if (!table) return;
        filters.forEach(f => table.column(f.column).search(f.value, f.regex, false));
    }, [filters]);

    const updateFilter = (column, value) => {
        setFilters(prev => prev.map(f => f.column === column ? { ...f, value } : f));
    };

    const handleFilter = () => { getTable()?.draw(); filterInstance.current?.hide(); };
    const handleReset = () => {
        setFilters(prev => prev.map(f => ({ ...f, value: '' })));
        getTable()?.columns().search('');
        getTable()?.draw();
        // F-BNK-002-02: Forzar recarga después de limpiar
        dataTableRef?.current?.ajax?.reload();
        filterInstance.current?.hide();
    };

    return (
        <div className="modal fade" ref={filterRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Cuentas Bancarias</h4>
                    </div>
                    <div className="modal-body">
                        <div className="row"><div className="col mb-3">
                            <InputModal type="text" id="f_ba_name" label="Nombre cuenta"
                                value={filters.find(f => f.column === 'accountName:name')?.value || ''}
                                onChange={e => updateFilter('accountName:name', e.target.value)}
                                placeholder="Buscar por nombre" error="" />
                        </div></div>
                        <div className="row"><div className="col mb-3">
                            <InputSelectModal id="f_ba_bank" label="Banco"
                                options={banks} value={filters.find(f => f.column === 'bank.name:name')?.value || ''}
                                onChange={value => updateFilter('bank.name:name', value)} />
                        </div></div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputSelectModal id="f_ba_type" label="Tipo de cuenta"
                                    options={ACCOUNT_TYPES}
                                    value={filters.find(f => f.column === 'accountType:name')?.value === '' ? [] : filters.find(f => f.column === 'accountType:name')?.value.split(',')}
                                    onChange={value => updateFilter('accountType:name', value.join(','))} multiple={true} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal id="f_ba_status" label="Estado"
                                    options={STATUSES}
                                    value={filters.find(f => f.column === 'status:name')?.value === '' ? [] : filters.find(f => f.column === 'status:name')?.value.split(',')}
                                    onChange={value => updateFilter('status:name', value.join(','))} multiple={true} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleFilter}>Filtrar</button>
                        <button type="button" className="btn btn-danger" onClick={handleReset}>Limpiar</button>
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterBankAccount;
