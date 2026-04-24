import { useState, useEffect, useRef } from 'react';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import InputModal from '../../../components/molecules/InputModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import CreateCommercialData from './create';
import UpdatedCommercialData from './updated';

const API_THIRD_PARTIES_SEARCH = ['api', 'v1', 'third-parties', 'search'];
const API_COMMERCIAL_GET = (id) => ['api', 'v1', 'commercial-data', id];
const API_COMMERCIAL_DELETE = (id) => ['api', 'v1', 'commercial-data', id];
const API_COMMERCIAL_HISTORY = (id) => ['api', 'v1', 'commercial-data', id, 'history'];
const API_PAYMENT_TERMS = ['api', 'v1', 'resources', 'payment-terms'];
const API_CURRENCIES = ['api', 'v1', 'accounting-lists', 'currency-types', 'search'];

const CATALOG_BODY = { draw: 1, start: 0, length: 10000, columns: [], search: { value: '', regex: false } };

const RISK_LABELS = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' };

// Traduccion de los nombres de campo que envia el backend
// (corresponden a los atributos de CommercialData auditados en trackChanges).
const FIELD_LABELS = {
    paymentTermId: 'Término de Pago',
    limitCredit:   'Límite de Crédito',
    riskLevel:     'Nivel de Riesgo',
    currencyId:    'Moneda',
    validityFrom:  'Vigencia Desde',
    validityTo:    'Vigencia Hasta',
};

/**
 * Pagina principal de Datos Comerciales de Terceros.
 * Permite seleccionar un tercero y ver/crear/editar/eliminar sus datos comerciales.
 */
const IndexCommercialData = () => {

    // Refs para modales
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    // Estado de alertas
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    // Catalogos
    const [thirdParties, setThirdParties] = useState([]);
    const [paymentTerms, setPaymentTerms] = useState([]);
    const [currencies, setCurrencies] = useState([]);

    // Seleccion de tercero
    const [selectedThirdPartyId, setSelectedThirdPartyId] = useState('');

    // Datos comerciales del tercero seleccionado
    const [commercialData, setCommercialData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Estado para modal create/update
    const [commercialForm, setCommercialForm] = useState({
        id: '',
        thirdPartyId: '',
        paymentTermId: '',
        limitCredit: '',
        currencyId: '',
        riskLevel: '',
        validityFrom: '',
        validityTo: '',
    });

    // Cargar catalogos al montar
    useEffect(() => {
        fetchHelper.post(base_url(API_THIRD_PARTIES_SEARCH), CATALOG_BODY, {}, 0)
            .then(res => {
                const list = res?.data ?? [];
                setThirdParties(list.map(tp => ({
                    id: tp.id,
                    label: `${tp.nit ?? '-'} - ${tp.businessName ?? 'Sin nombre'}`,
                })));
            })
            .catch(() => {});

        fetchHelper.post(base_url(API_PAYMENT_TERMS), CATALOG_BODY, {}, 0)
            .then(res => {
                const list = res?.data ?? [];
                setPaymentTerms(list.map(p => ({ id: p.id, label: p.name ?? String(p.id) })));
            })
            .catch(() => {});

        fetchHelper.post(base_url(API_CURRENCIES), CATALOG_BODY, {}, 0)
            .then(res => {
                const list = res?.data ?? [];
                setCurrencies(list.map(c => ({ id: c.id, label: `${c.isoCode} - ${c.name}` })));
            })
            .catch(() => {});
    }, []);

    // Cargar datos comerciales cuando cambia el tercero seleccionado
    useEffect(() => {
        if (!selectedThirdPartyId) {
            setCommercialData(null);
            setHistoryData([]);
            setShowHistory(false);
            return;
        }
        loadCommercialData();
    }, [selectedThirdPartyId]);

    /**
     * Carga los datos comerciales vigentes del tercero seleccionado.
     */
    const loadCommercialData = async () => {
        setLoading(true);
        setCommercialData(null);
        setHistoryData([]);
        setShowHistory(false);
        try {
            const res = await fetchHelper.get(
                base_url(API_COMMERCIAL_GET(selectedThirdPartyId)), {}, 0, false
            );
            const d = res?.data ?? res;
            setCommercialData(d);
        } catch {
            // 404 = no existe aun
            setCommercialData(null);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Carga el historial de cambios de datos comerciales del tercero.
     */
    const loadHistory = async () => {
        if (!selectedThirdPartyId) return;
        try {
            const res = await fetchHelper.get(
                base_url(API_COMMERCIAL_HISTORY(selectedThirdPartyId)), {}, 0, false
            );
            const list = res?.data ?? res;
            setHistoryData(Array.isArray(list) ? list : []);
            setShowHistory(true);
        } catch {
            setHistoryData([]);
            setShowHistory(true);
        }
    };

    /**
     * Abre el modal de creacion de datos comerciales.
     */
    const openModalCreate = () => {
        setCommercialForm({
            id: '',
            thirdPartyId: selectedThirdPartyId,
            paymentTermId: '',
            limitCredit: '',
            currencyId: '',
            riskLevel: '',
            validityFrom: '',
            validityTo: '',
        });
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /**
     * Abre el modal de edicion con los datos comerciales actuales.
     */
    const openModalUpdate = () => {
        if (!commercialData) return;
        setCommercialForm({
            id: commercialData.id ?? commercialData.Id ?? '',
            thirdPartyId: selectedThirdPartyId,
            paymentTermId: commercialData.paymentTermId ?? commercialData.paymentTerm?.id ?? '',
            limitCredit: commercialData.limitCredit ?? commercialData.creditLimit ?? '',
            currencyId: commercialData.currencyId ?? commercialData.currency?.id ?? '',
            riskLevel: commercialData.riskLevel?.name ?? commercialData.riskLevel ?? '',
            validityFrom: commercialData.validityFrom ?? '',
            validityTo: commercialData.validityTo ?? '',
        });
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    /**
     * Elimina los datos comerciales del tercero seleccionado con confirmacion.
     */
    const handleDelete = () => {
        if (!selectedThirdPartyId) return;
        window.Swal.fire({
            title: 'Eliminar datos comerciales',
            text: 'Esta accion eliminara los datos comerciales del tercero seleccionado. Esta seguro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Si, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            try {
                await fetchHelper.delete(
                    base_url(API_COMMERCIAL_DELETE(selectedThirdPartyId)), {}, {}, 500, false
                );
                setMessage({ message: 'Datos comerciales eliminados exitosamente.', type: 'success', show: true });
                loadCommercialData();
            } catch (error) {
                setMessage({
                    message: error?.msg || 'Error al eliminar los datos comerciales.',
                    type: 'danger',
                    show: true,
                });
            }
        });
    };

    /**
     * Callback invocado despues de crear o actualizar exitosamente.
     */
    const onSuccess = (msg) => {
        setMessage({ message: msg, type: 'success', show: true });
        loadCommercialData();
    };

    /**
     * Busca el label de un termino de pago por su ID.
     */
    const getPaymentTermLabel = (id) => {
        const found = paymentTerms.find(p => String(p.id) === String(id));
        return found ? found.label : (id ?? '-');
    };

    /**
     * Busca el label de una moneda por su ID.
     */
    const getCurrencyLabel = (id) => {
        const found = currencies.find(c => String(c.id) === String(id));
        return found ? found.label : (id ?? '-');
    };

    /**
     * Formatea un valor del historial segun el campo: resuelve IDs a labels
     * (paymentTermId -> nombre; currencyId -> codigo ISO; riskLevel -> label en espanol)
     * y aplica formato numerico a limitCredit.
     */
    const formatHistoryValue = (fieldName, value) => {
        if (value === null || value === undefined || value === '') return '-';
        switch (fieldName) {
            case 'limitCredit':
                return Number(value).toLocaleString('es-CO', { minimumFractionDigits: 2 });
            case 'paymentTermId':
                return getPaymentTermLabel(value);
            case 'currencyId':
                return getCurrencyLabel(value);
            case 'riskLevel':
                return RISK_LABELS[value] ?? value;
            default:
                return String(value);
        }
    };

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Datos Comerciales de Terceros</h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-body">
                    {/* Selector de tercero */}
                    <div className="row mb-4">
                        <div className="col-md-8">
                            <InputSelectModal
                                id="cd_thirdParty_select"
                                label="Seleccione un Tercero"
                                value={selectedThirdPartyId}
                                onChange={(v) => setSelectedThirdPartyId(v)}
                                options={thirdParties}
                                placeholder="Buscar tercero por NIT o nombre..."
                                clearable={true}
                            />
                        </div>
                        <div className="col-md-4 d-flex align-items-end gap-2">
                            {selectedThirdPartyId && !loading && !commercialData && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={openModalCreate}
                                >
                                    <i className="ri-add-line me-1"></i> Registrar Datos Comerciales
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Estado de carga */}
                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                            <p className="text-muted mt-2">Cargando datos comerciales...</p>
                        </div>
                    )}

                    {/* Sin tercero seleccionado */}
                    {!selectedThirdPartyId && !loading && (
                        <div className="text-center py-5">
                            <i className="ri-user-search-line fs-1 text-muted"></i>
                            <p className="text-muted mt-2">Seleccione un tercero para ver sus datos comerciales.</p>
                        </div>
                    )}

                    {/* Tercero seleccionado pero sin datos comerciales */}
                    {selectedThirdPartyId && !loading && !commercialData && (
                        <div className="text-center py-5">
                            <i className="ri-file-unknow-line fs-1 text-muted"></i>
                            <p className="text-muted mt-2">
                                No existen datos comerciales registrados para este tercero.
                            </p>
                        </div>
                    )}

                    {/* Datos comerciales encontrados */}
                    {selectedThirdPartyId && !loading && commercialData && (
                        <div>
                            {/* Botones de accion */}
                            <div className="d-flex gap-2 mb-4">
                                <button
                                    type="button"
                                    className="btn btn-label-primary"
                                    onClick={openModalUpdate}
                                >
                                    <i className="ri-edit-line me-1"></i> Editar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-label-danger"
                                    onClick={handleDelete}
                                >
                                    <i className="ri-delete-bin-5-line me-1"></i> Eliminar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-label-info"
                                    onClick={loadHistory}
                                >
                                    <i className="ri-history-line me-1"></i> Ver Historial
                                </button>
                            </div>

                            {/* Tabla de detalle */}
                            <div className="table-responsive">
                                <table className="table table-bordered">
                                    <tbody>
                                        <tr>
                                            <th className="bg-label-secondary" style={{ width: '30%' }}>Termino de Pago</th>
                                            <td>{getPaymentTermLabel(commercialData.paymentTermId ?? commercialData.paymentTerm?.id)}</td>
                                        </tr>
                                        <tr>
                                            <th className="bg-label-secondary">Limite de Credito</th>
                                            <td>
                                                {commercialData.limitCredit != null
                                                    ? Number(commercialData.limitCredit).toLocaleString('es-CO', { minimumFractionDigits: 2 })
                                                    : '-'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="bg-label-secondary">Moneda</th>
                                            <td>{getCurrencyLabel(commercialData.currencyId ?? commercialData.currency?.id)}</td>
                                        </tr>
                                        <tr>
                                            <th className="bg-label-secondary">Nivel de Riesgo</th>
                                            <td>
                                                {(() => {
                                                    const level = commercialData.riskLevel?.name ?? commercialData.riskLevel;
                                                    if (level === 'LOW') return <span className="badge bg-label-success">Bajo</span>;
                                                    if (level === 'MEDIUM') return <span className="badge bg-label-warning">Medio</span>;
                                                    if (level === 'HIGH') return <span className="badge bg-label-danger">Alto</span>;
                                                    return RISK_LABELS[level] ?? level ?? '-';
                                                })()}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className="bg-label-secondary">Vigencia Desde</th>
                                            <td>{commercialData.validityFrom ?? '-'}</td>
                                        </tr>
                                        <tr>
                                            <th className="bg-label-secondary">Vigencia Hasta</th>
                                            <td>{commercialData.validityTo ?? '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Historial de cambios */}
                    {showHistory && (
                        <div className="mt-4">
                            <h6 className="fw-bold mb-3">
                                <i className="ri-history-line me-1"></i> Historial de Cambios
                            </h6>
                            {historyData.length === 0 ? (
                                <p className="text-muted text-center py-3">No hay registros en el historial.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-striped table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Campo Modificado</th>
                                                <th>Valor Anterior</th>
                                                <th>Valor Nuevo</th>
                                                <th>Usuario</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyData.map((entry, idx) => {
                                                // Fecha: soporta backend que envia changedAt (actual) o createdAt (legacy)
                                                const fecha = entry.changedAt ?? entry.createdAt ?? '-';
                                                const fechaFmt = fecha !== '-' ? new Date(fecha).toLocaleString('es-CO') : '-';
                                                return (
                                                    <tr key={entry.id ?? idx}>
                                                        <td>{fechaFmt}</td>
                                                        <td>{FIELD_LABELS[entry.fieldName] ?? entry.fieldName ?? '-'}</td>
                                                        <td>{formatHistoryValue(entry.fieldName, entry.oldValue)}</td>
                                                        <td>{formatHistoryValue(entry.fieldName, entry.newValue)}</td>
                                                        <td>{entry.changedBy ?? '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary mt-2"
                                onClick={() => setShowHistory(false)}
                            >
                                Ocultar Historial
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear */}
            <CreateCommercialData
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                commercialData={commercialForm}
                setCommercialData={setCommercialForm}
                onSuccess={() => onSuccess('Datos comerciales registrados exitosamente.')}
                paymentTerms={paymentTerms}
                currencies={currencies}
            />

            {/* Modal Actualizar */}
            <UpdatedCommercialData
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                commercialData={commercialForm}
                setCommercialData={setCommercialForm}
                onSuccess={() => onSuccess('Datos comerciales actualizados exitosamente.')}
                paymentTerms={paymentTerms}
                currencies={currencies}
            />
        </>
    );
};

export default IndexCommercialData;
