import { use, useEffect, useRef, useState } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const formatCOP = (value) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(value);
};

// POST /api/v1/assets/depreciation/calculate — response.results[].depreciationMethod
const METHOD_LABELS = {
    LINEAR:               'Línea Recta',
    STRAIGHT_LINE:        'Línea Recta',
    DECLINING_BALANCE:    'Saldo Decreciente',
    UNITS_OF_PRODUCTION:  'Unidades de Producción',
};

const CLASSIFICATION_LABELS = {
    CURRENT: 'Corriente',
    NON_CURRENT: 'No corriente',
};

const currentPeriod = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const thStyle = { fontSize: '0.8rem', fontWeight: 500 };
const tdStyle = { fontSize: '0.875rem' };

const HISTORY_STATUS_MESSAGES = {
    400: 'Parámetro inválido para la consulta solicitada.',
    403: 'Acceso denegado. Se requiere rol de administrador.',
    500: 'Error interno del servidor al consultar el histórico.',
};

const CALCULATION_STATUS_MESSAGES = {
    400: 'Método no reconocido, no permitido o vida útil no definida.',
    403: 'Acceso denegado. Se requiere rol de administrador.',
    404: 'Cuenta de depreciación faltante o inactiva.',
    422: 'Operación no permitida: el periodo contable está cerrado.',
};

const getPayloadData = (response) => response?.data ?? response;

const normalizeArrayPayload = (response) => {
    const payload = getPayloadData(response);

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload && typeof payload === 'object') return [payload];

    return [];
};

const getDepreciationMethod = (item) => item?.depreciationMethod ?? item?.depretationType;

const asText = (value) => {
    if (value == null || value === '') return '—';
    if (typeof value === 'string' || typeof value === 'number') return String(value);

    if (typeof value === 'object') {
        return value.customName
            || value.name
            || value.businessName
            || value.label
            || value.code
            || value.assetCode
            || value.accountingCode
            || value.description
            || '—';
    }

    return String(value);
};

const getAccountingCode = (item) => (
    item?.accountingCode
    ?? item?.accountingAccountCode
    ?? item?.accountingAccount
    ?? item?.accountingAccountId
    ?? null
);

const getClassification = (item) => (
    item?.classification
    ?? item?.classificationName
    ?? null
);

const getClassificationLabel = (item) => {
    const classification = getClassification(item);
    return CLASSIFICATION_LABELS[classification] ?? classification;
};

const getSupplierLabel = (supplier) => {
    if (!supplier) return '—';
    if (typeof supplier === 'string') return supplier;

    return supplier.businessName
        || supplier.thirdPartyCode
        || supplier.nit
        || supplier.name
        || '—';
};

const formatDateTime = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
};

const CalculoDepreciacionActivos = () => {
    const tableRefElegibles = useRef(null);
    const dataTableRefElegibles = useRef(null);
    const tableRefResultados = useRef(null);
    const dataTableRefResultados = useRef(null);
    const tableRefHistoricoPeriodo = useRef(null);
    const dataTableRefHistoricoPeriodo = useRef(null);
    const tableRefHistoricoActivo = useRef(null);
    const dataTableRefHistoricoActivo = useRef(null);

    const [period, setPeriod] = useState(currentPeriod());
    const [assetHistoryId, setAssetHistoryId] = useState('');
    const [activosElegibles, setActivosElegibles] = useState([]);
    const [resultados, setResultados] = useState(null);
    const [assetMetadataMap, setAssetMetadataMap] = useState({});
    const [historicoPeriodo, setHistoricoPeriodo] = useState([]);
    const [historicoActivo, setHistoricoActivo] = useState([]);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [verificado, setVerificado] = useState(false);
    const [calculado, setCalculado] = useState(false);
    const [historicoPeriodoConsultado, setHistoricoPeriodoConsultado] = useState(false);
    const [historicoActivoConsultado, setHistoricoActivoConsultado] = useState(false);
    const [activeTab, setActiveTab] = useState('elegibles');
    const [searchElegibles, setSearchElegibles] = useState({ value: '', checked: true });
    const [searchResultados, setSearchResultados] = useState({ value: '', checked: true });
    const [searchHistoricoPeriodo, setSearchHistoricoPeriodo] = useState({ value: '', checked: true });
    const [searchHistoricoActivo, setSearchHistoricoActivo] = useState({ value: '', checked: true });

    const [assets, setAssets] = useState([]);

    const dismissAlert = () => setAlert({ show: false, type: '', message: '' });

    useEffect(() => {
        if (!alert.show) return;

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }, [alert]);

    // ACT-RF-02 — POST /api/v1/assets/depreciation/calculate?period=YYYY-MM
    const callEndpoint = () => {
        const url = base_url(['api', 'v1', 'assets', 'depreciation', 'calculate'], { period });
        return fetchHelper.post(url, {}, {}, 1000, true);
    };

    const fetchHistorialPeriodo = () => {
        const url = base_url(['api', 'v1', 'assets', 'depreciation', 'history'], { period });
        return fetchHelper.get(url, {}, 1000, true);
    };

    const fetchHistorialActivo = (assetId) => {
        const url = base_url(['api', 'v1', 'assets', 'depreciation', 'history', assetId]);
        return fetchHelper.get(url, {}, 1000, true);
    };

    const fetchAssetsMetadata = async () => {
        if (Object.keys(assetMetadataMap).length > 0) return assetMetadataMap;

        const response = await fetchHelper.post(
            base_url(['api', 'v1', 'assets', 'search']),
            { length: -1 },
            {},
            1,
            false,
        );

        const assets = normalizeArrayPayload(response);
        const nextMetadataMap = assets.reduce((accumulator, asset) => {
            if (asset?.id != null) accumulator[`id:${asset.id}`] = asset;
            if (asset?.assetCode) accumulator[`code:${asset.assetCode}`] = asset;
            return accumulator;
        }, {});

        setAssetMetadataMap(nextMetadataMap);
        return nextMetadataMap;
    };

    const enrichAssetsMetadata = async (items = []) => {
        if (!items.length) return [];

        const missingMetadata = items.some((item) => !getAccountingCode(item) || !getClassification(item));
        if (!missingMetadata) return items;

        try {
            const metadata = await fetchAssetsMetadata();

            return items.map((item) => {
                const source = metadata[`id:${item.assetId}`] || metadata[`code:${item.assetCode}`] || {};

                return {
                    ...source,
                    ...item,
                    accountingCode: getAccountingCode(item) ?? getAccountingCode(source),
                    classification: getClassification(item) ?? getClassification(source),
                };
            });
        } catch {
            return items;
        }
    };

    const loadHistorialActivo = async (assetId) => {
        dismissAlert();

        if (!assetId) {
            setHistoricoActivo([]);
            setHistoricoActivoConsultado(true);
            setAlert({
                show: true,
                type: 'warning',
                message: 'Ingrese un Asset ID válido para consultar el histórico.',
            });
            return;
        }

        try {
            const response = await fetchHistorialActivo(assetId);
            const records = normalizeArrayPayload(response);

            setHistoricoActivo(records);
            setHistoricoActivoConsultado(true);
            setAssetHistoryId(String(assetId));

            if (!records.length) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: `No se encontraron depreciaciones históricas para el activo ${assetId}.`,
                });
            } else {
                setAlert({
                    show: true,
                    type: 'success',
                    message: `Se cargó el histórico del activo ${assetId} con ${records.length} registro(s).`,
                });
            }
        } catch (error) {
            setHistoricoActivo([]);
            setHistoricoActivoConsultado(true);
            setAlert({
                show: true,
                type: 'danger',
                message: HISTORY_STATUS_MESSAGES[error.status] || error.msg || 'Error al consultar el histórico por activo',
            });
        }
    };

    // Paso 1: verificar activos elegibles (carga results sin mostrar sección de resultados)
    const handleVerificarElegibles = async () => {
        dismissAlert();
        setResultados(null);
        setCalculado(false);
        try {
            const response = await callEndpoint();
            const payload = response.data ?? response; // wrapper { code, data } o respuesta directa
            const enrichedResults = await enrichAssetsMetadata(payload.results || []);
            setActivosElegibles(enrichedResults);
            setVerificado(true);
            if (!enrichedResults.length) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: 'No se encontraron activos elegibles para el período seleccionado',
                });
            } else {
                setAlert({
                    show: true,
                    type: 'success',
                    message: `Se cargaron ${enrichedResults.length} activo(s) elegibles para el período ${period}.`,
                });
            }
        } catch (error) {
            setActivosElegibles([]);
            setVerificado(true);
            setAlert({
                show: true,
                type: 'danger',
                message: CALCULATION_STATUS_MESSAGES[error.status] || error.msg || 'Error al verificar activos elegibles',
            });
        }
    };

    // Paso 2: calcular depreciación (carga ambas secciones + muestra alert de resultado)
    const handleCalcularDepreciacion = async () => {
        dismissAlert();
        try {
            const response = await callEndpoint();
            const payload = response.data ?? response; // wrapper { code, data } o respuesta directa
            const enrichedResults = await enrichAssetsMetadata(payload.results || []);
            setActivosElegibles(enrichedResults);
            setResultados(payload);
            setVerificado(true);
            setCalculado(true);
            setAlert({
                show: true,
                type: 'success',
                message: payload.message || response.message || 'Depreciación calculada exitosamente',
            });
        } catch (error) {
            setAlert({
                show: true,
                type: 'danger',
                message: CALCULATION_STATUS_MESSAGES[error.status] || error.msg || 'Error al calcular la depreciación',
            });
        }
    };

    const handleConsultarHistoricoPeriodo = async () => {
        dismissAlert();

        try {
            const response = await fetchHistorialPeriodo();
            const records = normalizeArrayPayload(response);

            setHistoricoPeriodo(records);
            setHistoricoPeriodoConsultado(true);

            if (!records.length) {
                setAlert({
                    show: true,
                    type: 'warning',
                    message: 'No se encontraron depreciaciones históricas para el período seleccionado.',
                });
            } else {
                setAlert({
                    show: true,
                    type: 'success',
                    message: `Se cargó el histórico del período ${period} con ${records.length} registro(s).`,
                });
            }
        } catch (error) {
            setHistoricoPeriodo([]);
            setHistoricoPeriodoConsultado(true);
            setAlert({
                show: true,
                type: 'danger',
                message: HISTORY_STATUS_MESSAGES[error.status] || error.msg || 'Error al consultar el histórico por período',
            });
        }
    };

    const handleConsultarHistoricoActivo = async () => {
        await loadHistorialActivo(assetHistoryId);
    };

    const columnsElegibles = [
        { title: 'Asset ID', data: 'assetCode', name: 'assetCode', render: (value) => asText(value) },
        { title: 'Nombre', data: 'assetName', name: 'assetName', render: (value, type, row) => asText(value ?? row.name) },
        { title: 'Cuenta activo', data: 'accountingCode', name: 'accountingCode', render: (value, type, row) => asText(value ?? getAccountingCode(row)) },
        { title: 'Clasificacion', data: 'classification', name: 'classification', render: (value, type, row) => asText(getClassificationLabel(row)) },
        {
            title: 'Metodo',
            data: 'depreciationMethod',
            name: 'depreciationMethod',
            render: (value, type, row) => {
                const method = value ?? getDepreciationMethod(row);
                return asText(METHOD_LABELS[method] ?? method);
            },
        },
        { title: 'F. Calculo', data: 'calculationDate', name: 'calculationDate', render: (value) => asText(value) },
        { title: 'Costo', data: 'previousBookValue', name: 'previousBookValue', render: (value) => formatCOP(value) },
        { title: 'Dep. Periodo', data: 'depreciationAmount', name: 'depreciationAmount', render: (value) => formatCOP(value) },
        {
            title: 'Valor Libros · Cta Dep.',
            data: 'currentBookValue',
            name: 'currentBookValue',
            render: (value, type, row) => {
                if (value == null) return '—';
                const depAccount = asText(row.depreciationAccountName);
                return `${formatCOP(value)} · ${depAccount === '—' ? '' : depAccount}`.replace(/ · $/, '');
            },
        },
        {
            title: 'Historico',
            data: 'assetId',
            name: 'assetId',
            searchable: false,
            render: (assetId) => `
                <button class="btn btn-sm btn-outline-secondary waves-effect action-btn"
                    data-action="history" data-id="${assetId}" title="Ver historico">
                    Ver historico
                </button>`,
        },
    ];

    const columnsResultados = [
        { title: 'Asset ID', data: 'assetCode', name: 'assetCode', render: (value) => asText(value) },
        { title: 'Nombre', data: 'assetName', name: 'assetName', render: (value, type, row) => asText(value ?? row.name) },
        {
            title: 'Metodo',
            data: 'depreciationMethod',
            name: 'depreciationMethod',
            render: (value, type, row) => {
                const method = value ?? getDepreciationMethod(row);
                return asText(METHOD_LABELS[method] ?? method);
            },
        },
        {
            title: 'Dep. periodo · Cta Dep.',
            data: 'depreciationAmount',
            name: 'depreciationAmount',
            render: (value, type, row) => {
                if (value == null) return '—';
                const depAccount = asText(row.depreciationAccountName);
                return `${formatCOP(value)} · ${depAccount === '—' ? '' : depAccount}`.replace(/ · $/, '');
            },
        },
        {
            title: 'Proveedor',
            data: 'supplier',
            name: 'supplier',
            render: (value, type, row) => getSupplierLabel(value) !== '—' ? getSupplierLabel(value) : asText(row.supplierName),
        },
        {
            title: 'Historico',
            data: 'assetId',
            name: 'assetId',
            searchable: false,
            render: (assetId) => `
                <button class="btn btn-sm btn-outline-secondary waves-effect action-btn"
                    data-action="history" data-id="${assetId}" title="Ver historico">
                    Ver historico
                </button>`,
        },
    ];

    const columnsHistoricoPeriodo = [
        { title: 'Asset ID', data: 'assetCode', name: 'assetCode', render: (value) => asText(value) },
        { title: 'Nombre', data: 'assetName', name: 'assetName', render: (value, type, row) => asText(value ?? row.name) },
        { title: 'Periodo', data: 'depreciationPeriod', name: 'depreciationPeriod', render: (value) => asText(value) },
        {
            title: 'Metodo',
            data: 'depreciationMethod',
            name: 'depreciationMethod',
            render: (value, type, row) => {
                const method = value ?? getDepreciationMethod(row);
                return asText(METHOD_LABELS[method] ?? method);
            },
        },
        { title: 'Valor anterior', data: 'previousBookValue', name: 'previousBookValue', render: (value) => formatCOP(value) },
        { title: 'Dep. periodo', data: 'depreciationAmount', name: 'depreciationAmount', render: (value) => formatCOP(value) },
        { title: 'Valor actual', data: 'currentBookValue', name: 'currentBookValue', render: (value) => formatCOP(value) },
        { title: 'F. calculo', data: 'calculationDate', name: 'calculationDate', render: (value) => asText(value) },
        { title: 'Creado', data: 'createdAt', name: 'createdAt', render: (value) => formatDateTime(value) },
    ];

    const columnsHistoricoActivo = [
        { title: 'Periodo', data: 'depreciationPeriod', name: 'depreciationPeriod', render: (value) => asText(value) },
        { title: 'Asset ID', data: 'assetCode', name: 'assetCode', render: (value) => asText(value) },
        { title: 'Nombre', data: 'assetName', name: 'assetName', render: (value, type, row) => asText(value ?? row.name) },
        {
            title: 'Metodo',
            data: 'depreciationMethod',
            name: 'depreciationMethod',
            render: (value, type, row) => {
                const method = value ?? getDepreciationMethod(row);
                return asText(METHOD_LABELS[method] ?? method);
            },
        },
        { title: 'Valor anterior', data: 'previousBookValue', name: 'previousBookValue', render: (value) => formatCOP(value) },
        { title: 'Dep. periodo', data: 'depreciationAmount', name: 'depreciationAmount', render: (value) => formatCOP(value) },
        { title: 'Valor actual', data: 'currentBookValue', name: 'currentBookValue', render: (value) => formatCOP(value) },
        { title: 'F. calculo', data: 'calculationDate', name: 'calculationDate', render: (value) => asText(value) },
        { title: 'Creado', data: 'createdAt', name: 'createdAt', render: (value) => formatDateTime(value) },
    ];

    useEffect(() => {
        const bindAction = (tableRefInstance) => {
            const table = tableRefInstance?.current;
            if (!table) return () => {};

            const handler = function () {
                const action = $(this).data('action');
                const id = Number($(this).data('id'));

                if (action === 'history' && id) {
                    loadHistorialActivo(id);
                    setActiveTab('historico-activo');
                }
            };

            table.on('click', '.action-btn', handler);
            return () => table.off('click', '.action-btn', handler);
        };

        const cleanElegibles = bindAction(dataTableRefElegibles);
        const cleanResultados = bindAction(dataTableRefResultados);

        return () => {
            cleanElegibles();
            cleanResultados();
        };
    }, [activosElegibles, resultados]);

    useEffect(() => {

        console.log('fetchAssets');

        const fetchAssets = async () => {
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'assets', 'search']),
                { length: -1 },
                {},
                1,
                false,
            );
            const payload = response.data ?? response;
            setAssets(payload);
        }
        fetchAssets();
    }, [])

    useEffect(() => {
        console.log(assets, 'assets');
    }, [assets])

    return (
        <>
            {/* Título de página */}
            <div className="col-12">
                <h4 className="fw-bold mb-0">Activos</h4>
            </div>

            {/* Alert de resultado */}
            {alert.show && (
                <div className="col-12">
                    <div
                        className={`alert alert-${alert.type} alert-dismissible d-flex align-items-center mb-0`}
                        role="alert"
                    >
                        <i
                            className={`ri-${alert.type === 'success' ? 'checkbox-circle' : 'error-warning'}-line me-2`}
                            style={{ fontSize: '1.1rem' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{alert.message}</span>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={dismissAlert}
                            aria-label="Cerrar"
                        />
                    </div>
                </div>
            )}

            {/* Ejecución */}
            <div className="col-12">
                <div className="card">
                    <div className="card-body py-3">
                        <p className="fw-semibold mb-3">Ejecución</p>
                        <div className="d-flex gap-3 flex-wrap align-items-end">
                            <div>
                                <label className="form-label mb-1" style={{ fontSize: '0.875rem' }}>
                                    Periodo contable
                                </label>
                                <input
                                    type="month"
                                    className="form-control form-control-sm"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    style={{ width: '160px' }}
                                />
                            </div>
                            <button
                                className="btn btn-outline-secondary waves-effect"
                                onClick={handleVerificarElegibles}
                                disabled={!period}
                            >
                                Verificar activos elegibles
                            </button>
                            <button
                                className="btn btn-primary waves-effect"
                                onClick={handleCalcularDepreciacion}
                                disabled={!period}
                            >
                                Calcular depreciación
                            </button>
                            <button
                                className="btn btn-outline-primary waves-effect"
                                onClick={handleConsultarHistoricoPeriodo}
                                disabled={!period}
                            >
                                Consultar histórico del período
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="card-body py-3">
                        <p className="fw-semibold mb-3">Histórico por activo</p>
                        <div className="d-flex gap-3 flex-wrap align-items-end">
                            <div>

                                <InputSelectModal
                                    id="assetHistoryId"
                                    label="Asset ID"
                                    value={assetHistoryId}
                                    onChange={(value) => {
                                        console.log(assets, 'value');
                                        setAssetHistoryId(value)
                                    }
                                    }
                                    options={assets.map(asset => ({
                                        id: asset.id,
                                        label: `${asset.assetCode} - ${asset.name}`,
                                    }))}
                                    
                                    clearable={true}
                                />

                                {/* <label className="form-label mb-1" style={{ fontSize: '0.875rem' }}>
                                    Asset ID
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-control form-control-sm"
                                    value={assetHistoryId}
                                    onChange={(e) => setAssetHistoryId(e.target.value)}
                                    style={{ width: '160px' }}
                                    placeholder="Ej: 15"
                                /> */}
                            </div>
                            <button
                                className="btn btn-outline-secondary waves-effect"
                                onClick={handleConsultarHistoricoActivo}
                                disabled={!assetHistoryId}
                            >
                                Consultar histórico del activo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="card-body pb-2">
                        <div className="nav-align-top mb-2">
                            <ul className="nav nav-pills mb-4" role="tablist">
                                <li className="nav-item" role="presentation">
                                    <button
                                        type="button"
                                        className={`nav-link waves-effect ${activeTab === 'elegibles' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('elegibles')}
                                    >
                                        Activos elegibles
                                        <span className="badge bg-label-primary ms-2">{activosElegibles.length}</span>
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        type="button"
                                        className={`nav-link waves-effect ${activeTab === 'resultados' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('resultados')}
                                    >
                                        Resultados del cálculo
                                        <span className="badge bg-label-primary ms-2">{resultados?.results?.length ?? 0}</span>
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        type="button"
                                        className={`nav-link waves-effect ${activeTab === 'historico-periodo' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('historico-periodo')}
                                    >
                                        Histórico del período
                                        <span className="badge bg-label-primary ms-2">{historicoPeriodo.length}</span>
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        type="button"
                                        className={`nav-link waves-effect ${activeTab === 'historico-activo' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('historico-activo')}
                                    >
                                        Histórico del activo
                                        <span className="badge bg-label-primary ms-2">{historicoActivo.length}</span>
                                    </button>
                                </li>
                            </ul>

                            <div className="tab-content">
                                <div className={`tab-pane fade ${activeTab === 'elegibles' ? 'show active' : ''}`}>
                                    <p className="fw-semibold mb-3">Activos elegibles</p>
                                    {verificado && activosElegibles.length > 0 ? (
                                        <div className="card-datatable text-nowrap">
                                            <DataTableReference
                                                url_api={['api', 'v1', 'assets', 'depreciation', 'calculate']}
                                                columns={columnsElegibles}
                                                tableRef={tableRefElegibles}
                                                dataTableRef={dataTableRefElegibles}
                                                method="POST"
                                                buttons={[]}
                                                title="Activos elegibles"
                                                setData={setActivosElegibles}
                                                exportParams={{ period }}
                                                exportMethod="POST"
                                                search={searchElegibles}
                                                setSearch={setSearchElegibles}
                                                filtered={true}
                                                data={activosElegibles}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-muted mb-0" style={tdStyle}>
                                            {verificado
                                                ? 'No hay activos elegibles para el período seleccionado'
                                                : 'Presione "Verificar activos elegibles" para cargar los datos'}
                                        </p>
                                    )}
                                </div>

                                <div className={`tab-pane fade ${activeTab === 'resultados' ? 'show active' : ''}`}>
                                    <p className="fw-semibold mb-3">Resultados del cálculo</p>
                                    {calculado && (resultados?.results || []).length > 0 ? (
                                        <div className="card-datatable text-nowrap">
                                            <DataTableReference
                                                url_api={['api', 'v1', 'assets', 'depreciation', 'calculate']}
                                                columns={columnsResultados}
                                                tableRef={tableRefResultados}
                                                dataTableRef={dataTableRefResultados}
                                                method="POST"
                                                buttons={[]}
                                                title="Resultados del calculo"
                                                exportParams={{ period }}
                                                exportMethod="POST"
                                                search={searchResultados}
                                                setSearch={setSearchResultados}
                                                filtered={true}
                                                data={resultados?.results || []}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-muted mb-0" style={tdStyle}>
                                            {!calculado
                                                ? 'Presione "Calcular depreciación" para ver los resultados'
                                                : 'No hay resultados para mostrar en el período seleccionado'}
                                        </p>
                                    )}

                                    {calculado && resultados?.skipped?.length > 0 && (
                                        <div className="pt-3 mt-2 border-top">
                                            <p className="fw-semibold mb-2 text-muted" style={{ fontSize: '0.8rem' }}>
                                                Activos excluidos del cálculo ({resultados.skipped.length})
                                            </p>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-borderless mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th className="text-muted ps-0" style={thStyle}>AssetID</th>
                                                            <th className="text-muted" style={thStyle}>Nombre</th>
                                                            <th className="text-muted" style={thStyle}>Motivo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {resultados.skipped.map((s) => (
                                                            <tr key={s.assetId} style={tdStyle}>
                                                                <td className="ps-0 text-muted">{asText(s.assetCode)}</td>
                                                                <td className="text-muted">{asText(s.assetName ?? s.name)}</td>
                                                                <td className="text-muted">{asText(s.reason)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-3 pb-1 border-top mt-2">
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                            Total depreciación del periodo:{' '}
                                            {!calculado
                                                ? ''
                                                : resultados?.totalDepreciation != null
                                                    ? formatCOP(resultados.totalDepreciation)
                                                    : '-----'}
                                        </span>
                                        {calculado && (
                                            <span className="ms-4 text-muted" style={{ fontSize: '0.8rem' }}>
                                                Procesados: {resultados?.processedCount ?? 0} &nbsp;·&nbsp; Excluidos: {resultados?.skippedCount ?? 0}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={`tab-pane fade ${activeTab === 'historico-periodo' ? 'show active' : ''}`}>
                                    <p className="fw-semibold mb-3">Histórico del período</p>
                                    {historicoPeriodoConsultado && historicoPeriodo.length > 0 ? (
                                        <div className="card-datatable text-nowrap">
                                            <DataTableReference
                                                url_api={['api', 'v1', 'assets', 'depreciation', 'history']}
                                                columns={columnsHistoricoPeriodo}
                                                tableRef={tableRefHistoricoPeriodo}
                                                dataTableRef={dataTableRefHistoricoPeriodo}
                                                method="GET"
                                                buttons={[]}
                                                title="Historico del periodo"
                                                exportParams={{ period }}
                                                exportMethod="GET"
                                                search={searchHistoricoPeriodo}
                                                setSearch={setSearchHistoricoPeriodo}
                                                filtered={true}
                                                data={historicoPeriodo}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-muted mb-0" style={tdStyle}>
                                            {historicoPeriodoConsultado
                                                ? 'No hay registros históricos para el período seleccionado'
                                                : 'Presione "Consultar histórico del período" para cargar los datos'}
                                        </p>
                                    )}
                                </div>

                                <div className={`tab-pane fade ${activeTab === 'historico-activo' ? 'show active' : ''}`}>
                                    <p className="fw-semibold mb-3">Histórico del activo</p>
                                    {historicoActivoConsultado && historicoActivo.length > 0 ? (
                                        <div className="card-datatable text-nowrap">
                                            <DataTableReference
                                                url_api={['api', 'v1', 'assets', 'depreciation', 'history', assetHistoryId || 0]}
                                                columns={columnsHistoricoActivo}
                                                tableRef={tableRefHistoricoActivo}
                                                dataTableRef={dataTableRefHistoricoActivo}
                                                method="GET"
                                                buttons={[]}
                                                title="Historico del activo"
                                                exportMethod="GET"
                                                search={searchHistoricoActivo}
                                                setSearch={setSearchHistoricoActivo}
                                                filtered={true}
                                                data={historicoActivo}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-muted mb-0" style={tdStyle}>
                                            {historicoActivoConsultado
                                                ? 'No hay registros históricos para el activo consultado'
                                                : 'Ingrese un Asset ID o use "Ver histórico" en una fila para consultar'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

export default CalculoDepreciacionActivos;
