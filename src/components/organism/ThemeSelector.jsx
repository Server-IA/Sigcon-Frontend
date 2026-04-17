import React, { useState, useEffect } from 'react';
import ColorSwatch from '../atoms/ColorSwatch';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import { fetchHelper } from '../../utils/fetch';
import { base_url, lightenColor } from '../../utils/functions';
import { useDispatch } from 'react-redux';

const ThemeSelector = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('Colores');
    const [globalParams, setGlobalParams] = useState([]);
    const [userPreferences, setUserPreferences] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(2);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'Colores' || activeTab === 'Textos') {
                const category = activeTab === 'Colores' ? 'COLOR' : 'FONT';

                // 1. Fetch Global Parameters
                const urlGlobal = base_url(['api', 'parameters']);
                const globalRes = await fetchHelper.post(urlGlobal, { length: -1 }, {}, 0);

                const allParams = globalRes.data || [];
                const filteredParams = allParams.filter(p => p.category === category);

                console.log(`Global parameters for ${category}:`, filteredParams);

                // 2. Fetch User Specific Preferences
                const urlUser = base_url(['api', 'parameters', 'user']);
                const userRes = await fetchHelper.post(urlUser, { length: -1 }, {}, 0);

                // Map user preferences by parameter ID for easy lookup
                const prefsMap = {};
                userRes.data?.forEach(pref => {
                    prefsMap[pref.parameter_id] = {
                        id: pref.id,
                        value: pref.value
                    };
                });

                setGlobalParams(filteredParams);
                setUserPreferences(prefsMap);
            }
        } catch (error) {
            console.error('Error fetching theme data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleColorChange = (paramId, newValue) => {
        setUserPreferences(prev => ({
            ...prev,
            [paramId]: {
                ...prev[paramId],
                value: newValue,
                isDirty: true
            }
        }));

        // Option: Apply real-time preview by updating CSS variable
        const param = globalParams.find(p => p.id === paramId);
        if (param) {
            // We assume the variable name follows a convention or we can try to find it
            // Based on config.js, it might be --config-name
            const varName = `--config-${param.name.toLowerCase().replace(/\s+/g, '-')}`;
            document.documentElement.style.setProperty(varName, newValue);
            const varNameLabel = `--config-${param.name.toLowerCase().replace(/\s+/g, '-')}-label`;
            document.documentElement.style.setProperty(varNameLabel, `${lightenColor(newValue, 90)}`);
            const varNameHover = `--config-${param.name.toLowerCase().replace(/\s+/g, '-')}-hover`;
            document.documentElement.style.setProperty(varNameHover, `${lightenColor(newValue, 20)}`);
            const varNameFocus = `--config-${param.name.toLowerCase().replace(/\s+/g, '-')}-focus`;
            document.documentElement.style.setProperty(varNameFocus, `${lightenColor(newValue, 70)}`);
        }
    };

    const handleSaveTheme = async () => {
        try {
            const dirtyParamsIds = Object.keys(userPreferences).filter(id => userPreferences[id].isDirty);

            if (dirtyParamsIds.length === 0) {
                window.Swal.fire({
                    icon: 'info',
                    text: 'No hay cambios para guardar'
                });
                return;
            }

            for (const paramId of dirtyParamsIds) {
                const pref = userPreferences[paramId];
                if (pref.id) {
                    // Update existing - URL uses parameterId as per user guide
                    const urlUpdate = base_url(['api', 'parameters', 'user', paramId]);
                    const {data: user} = await fetchHelper.put(urlUpdate, { colorValue: pref.value }, {}, 1000);
                    dispatch({ type: "SET_USER", payload: user });
                } else {
                    // Create new
                    const urlCreate = base_url(['api', 'parameters', 'user', 'create']);
                    const { data:user } = await fetchHelper.post(urlCreate, {
                        parameterId: parseInt(paramId),
                        colorValue: pref.value
                    }, {}, 1000);
                    
                    dispatch({ type: "SET_USER", payload: user });
                }
            }

            window.Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Preferencias guardadas correctamente',
                timer: 2000,
                showConfirmButton: false
            });

            fetchData();
        } catch (error) {
            console.error('Error saving theme changes:', error);
            window.Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron guardar los cambios'
            });
        }
    };

    const handleSaveNewTheme = async () => {
        // This functionality might be for future use or admin profiles
        const url = base_url(['api', 'parameters', 'store']);
        try {
            await fetchHelper.post(url, { name: 'Nuevo Tema', category: 'TEMA', status: 'ACTIVE' }, {}, 1000);
            window.Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Nuevo tema base creado'
            });
        } catch (error) {
            console.error('Error saving new theme:', error);
        }
    };

    const displayParams = globalParams.map(param => {
        const userPref = userPreferences[param.id];
        return {
            ...param,
            currentValue: userPref?.value || param.value || '#000000',
            userPrefId: userPref?.id
        };
    });

    return (
        <div className="theme-selector-container">
            <h3 className="theme-selector-title">Tema del sistema</h3>

            <div className="theme-selector-tabs">
                {['Colores', 'Textos', 'Temas Guardados'].map(tab => (
                    <button
                        key={tab}
                        className={`theme-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="theme-settings-list">
                {loading ? (
                    <div className="text-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                    </div>
                ) : displayParams.length > 0 ? (
                    displayParams.map((param) => (
                        <div key={param.id} className="theme-setting-item">
                            <div className="theme-setting-info">
                                <span className="theme-setting-label">{param.name}</span>
                                <span className="theme-setting-value">{param.currentValue}</span>
                                <span className="theme-setting-description">{param.description}</span>
                            </div>
                            <ColorSwatch
                                color={param.currentValue}
                                onChange={(color) => handleColorChange(param.id, color)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center p-4">No se encontraron parámetros.</div>
                )}
            </div>

            <div className="theme-selector-pagination">
                <div className="pagination-controls">
                    <Icon name="ri-arrow-left-s-line" onClick={() => setCurrentPage(1)} />
                    <span className={`pagination-page ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>1</span>
                    <span className={`pagination-page ${currentPage === 2 ? 'active' : ''}`} onClick={() => setCurrentPage(2)}>2</span>
                    <Icon name="ri-arrow-right-s-line" onClick={() => setCurrentPage(2)} />
                </div>
                <div className="go-to-page">
                    Go to Page <input type="text" value="2" readOnly />
                </div>
            </div>

            <div className="theme-selector-actions">
                <Button variant="primary" onClick={handleSaveTheme}>Guardar Cambios</Button>
                {/* <Button variant="secondary" onClick={handleSaveNewTheme}>Guardar nuevo tema</Button> */}
            </div>
        </div>
    );
};

export default ThemeSelector;
