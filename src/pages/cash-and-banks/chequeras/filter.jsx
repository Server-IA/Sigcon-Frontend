import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputDate from '../../../components/molecules/InputDate';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

// Modal de filtros para consulta de chequeras (RF-19).
const FilterCheckbook = ({
    filterRef,
    filterInstance,
    dataTableRef,
    statuses = [],
    accountOptions = [],
}) => {

    // Acceso conveniente a la tabla interna.
    const getTable = () => dataTableRef?.current?.table();

    // Estado de filtros (nombre de columna + valor + modo regex).
    const [filters, setFilters] = useState([
        { regex: true, value: '', column: 'checkbookNumber:name' },
        { regex: true, value: '', column: 'issuingBank:name' },
        { regex: true, value: '', column: 'status:name' },
        { regex: false, value: '', column: 'bankAccountId:name' },
        { regex: false, value: '', column: 'receivedDate:name' },
        { regex: false, value: '', column: 'receivedDate_hasta:name' },
        { regex: false, value: '', column: 'activationDate:name' },
        { regex: false, value: '', column: 'activationDate_hasta:name' },
    ]);

    // Sincroniza filtros con DataTable al cambiar cualquier valor.
    useEffect(() => {
        const table = getTable();
        if (!table) return;

        filters.forEach(item => {
            // Campos "_hasta" quedan listos para backend cuando procese rangos.
            if (item.column.includes('_hasta')) return;
            table.column(item.column).search(item.value, item.regex, false);
        });
    }, [filters]);

    // Helpers de lectura/escritura del estado de filtros.
    const getFilter = (column) => filters.find(item => item.column === column);
    const updateFilter = (column, key, value) => {
        setFilters(prev => prev.map(item => item.column === column ? { ...item, [key]: value } : item));
    };
    const selectValue = (column) => {
        const value = getFilter(column)?.value;
        return value === '' ? [] : value.split(',');
    };

    // Aplica filtros y ejecuta draw.
    const handleFilter = () => {
        const table = getTable();
        if (!table) return;
        table.draw();
        filterInstance?.current?.hide();
    };

    // Limpia todos los filtros de columna.
    const handleClear = () => {
        const table = getTable();
        if (!table) return;
        table.columns().search('');
        table.search('');
        table.draw();
        setFilters(prev => prev.map(item => ({ ...item, value: '' })));
        filterInstance?.current?.hide();
    };

    return (
        <div className="modal fade" ref={filterRef} id="modalFilterCheckbook" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Chequeras</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* Numero de chequera + banco emisor. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('checkbookNumber:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Busqueda por coincidencia"
                                            onChange={(event) => updateFilter('checkbookNumber:name', 'regex', event.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_checkbook_number"
                                        label="Numero de chequera"
                                        value={getFilter('checkbookNumber:name')?.value || ''}
                                        onChange={(event) => updateFilter('checkbookNumber:name', 'value', event.target.value)}
                                        placeholder="Buscar por numero"
                                        error=""
                                        maxLength={20}
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('issuingBank:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Busqueda por coincidencia"
                                            onChange={(event) => updateFilter('issuingBank:name', 'regex', event.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputModal
                                        type="text"
                                        id="filter_issuing_bank"
                                        label="Banco emisor"
                                        value={getFilter('issuingBank:name')?.value || ''}
                                        onChange={(event) => updateFilter('issuingBank:name', 'value', event.target.value)}
                                        placeholder="Buscar por banco"
                                        error=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Estado + cuenta bancaria. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <div className="input-group">
                                    <div className="input-group-text form-check mb-0">
                                        <input
                                            checked={getFilter('status:name')?.regex || false}
                                            className="form-check-input m-auto"
                                            type="checkbox"
                                            title="Busqueda por coincidencia"
                                            onChange={(event) => updateFilter('status:name', 'regex', event.target.checked)}
                                            disabled={!dataTableRef?.current}
                                        />
                                    </div>
                                    <InputSelectModal
                                        id="filter_status"
                                        label="Estado"
                                        options={statuses}
                                        value={selectValue('status:name')}
                                        onChange={(value) => updateFilter('status:name', 'value', value.join(','))}
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            <div className="col-md-6 mb-4 mt-2">
                                {accountOptions.length > 0 ? (
                                    <InputSelectModal
                                        id="filter_bank_account"
                                        label="Cuenta bancaria"
                                        options={accountOptions}
                                        value={String(getFilter('bankAccountId:name')?.value || '')}
                                        onChange={(value) => updateFilter('bankAccountId:name', 'value', value)}
                                        placeholder="Seleccione una cuenta"
                                    />
                                ) : (
                                    <InputModal
                                        type="number"
                                        id="filter_bank_account_manual"
                                        label="ID cuenta bancaria"
                                        value={getFilter('bankAccountId:name')?.value || ''}
                                        onChange={(event) => updateFilter('bankAccountId:name', 'value', event.target.value)}
                                        placeholder="Filtrar por ID de cuenta"
                                        error=""
                                    />
                                )}
                            </div>
                        </div>

                        {/* Fecha recepcion desde/hasta. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                {/* Calendario reutilizado (mismo componente usado en depreciation_rules). */}
                                <InputDate
                                    id="filter_received_date_from"
                                    label="F. recepcion desde"
                                    date={getFilter('receivedDate:name')?.value || ''}
                                    onChange={(date) => updateFilter('receivedDate:name', 'value', date || '')}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    error=""
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                {/* Calendario reutilizado (mismo componente usado en depreciation_rules). */}
                                <InputDate
                                    id="filter_received_date_to"
                                    label="F. recepcion hasta"
                                    date={getFilter('receivedDate_hasta:name')?.value || ''}
                                    onChange={(date) => updateFilter('receivedDate_hasta:name', 'value', date || '')}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    error=""
                                />
                            </div>
                        </div>

                        {/* Fecha activacion desde/hasta. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                {/* Calendario reutilizado (mismo componente usado en depreciation_rules). */}
                                <InputDate
                                    id="filter_activation_date_from"
                                    label="F. activacion desde"
                                    date={getFilter('activationDate:name')?.value || ''}
                                    onChange={(date) => updateFilter('activationDate:name', 'value', date || '')}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    error=""
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                {/* Calendario reutilizado (mismo componente usado en depreciation_rules). */}
                                <InputDate
                                    id="filter_activation_date_to"
                                    label="F. activacion hasta"
                                    date={getFilter('activationDate_hasta:name')?.value || ''}
                                    onChange={(date) => updateFilter('activationDate_hasta:name', 'value', date || '')}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    error=""
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleFilter}>
                            Filtrar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleClear}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterCheckbook;
