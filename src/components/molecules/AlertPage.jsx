import PropTypes from 'prop-types';
import { useEffect, useState, useRef } from 'react';

const AlertPage = ({ type = 'info', message = '', show = false, duration = 5000, onChange = () => {} }) => {
    const [visible, setVisible] = useState(false);
    const [animState, setAnimState] = useState('hidden'); // 'hidden' | 'entering' | 'visible' | 'exiting'
    const timeoutRef = useRef(null);
    const fadeTimeoutRef = useRef(null);

    useEffect(() => {
        // Limpiar timeouts previos
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

        if (show) {
            // Montar el componente en estado "entering" (invisible)
            setVisible(true);
            setAnimState('entering');

            // En el siguiente frame, activar la animación de entrada
            requestAnimationFrame(() => {
                setAnimState('visible');
            });

            if(duration > 0){
                // Iniciar fade-out después de `duration` ms
                timeoutRef.current = setTimeout(() => {
                    setAnimState('exiting');
                    fadeTimeoutRef.current = setTimeout(() => {
                        setVisible(false);
                        setAnimState('hidden');
                        onChange();
                    }, 500);
                }, duration);
            }
        } else {
            setVisible(false);
            setAnimState('hidden');
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        };
    }, [show, duration, onChange]);

    if (!visible) return null;

    const getStyle = () => {
        const base = {
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            overflow: 'hidden',
        };

        switch (animState) {
            case 'entering':
                return { ...base, opacity: 0, transform: 'translateY(-15px)' };
            case 'visible':
                return { ...base, opacity: 1, transform: 'translateY(0)' };
            case 'exiting':
                return { ...base, opacity: 0, transform: 'translateY(-15px)' };
            default:
                return { ...base, opacity: 0 };
        }
    };

    return (
        <div
            className={`alert alert-${type} alert-dismissible`}
            role="alert"
            style={getStyle()}
        >
            <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => {
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
                    setAnimState('exiting');
                    setTimeout(() => {
                        setVisible(false);
                        setAnimState('hidden');
                        onChange();
                    }, 400);
                }}
            ></button>
            {/* HU-AR-01B DEF#3: preservar saltos de linea cuando el mensaje
                viene como lista multilinea de errores de validacion. */}
            <span style={{ whiteSpace: 'pre-line' }}>{message}</span>
        </div>
    )
}

// PropTypes opcionales con defaults definidos arriba. AlertPage es seguro
// renderizar con props vacios (queda invisible si show=false).
AlertPage.propTypes = {
    type: PropTypes.string,
    message: PropTypes.string,
    show: PropTypes.bool,
    duration: PropTypes.number,
    onChange: PropTypes.func,
}

export default AlertPage;