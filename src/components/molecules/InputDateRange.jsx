import { useEffect, useRef } from "react";

const InputDateRange = ({ id, label, dateInit, dateEnd, onChange, error, placeholder, required}) => {

    const dateRangeRef = useRef(null);

    const flatpickrInstance = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {

        if (!flatpickrInstance.current) {
            flatpickrInstance.current = flatpickr(dateRangeRef.current, {
                mode: 'range',
                dateFormat: 'Y-m-d',
                onChange: (selectedDates) => {
                    onChangeRef.current?.(selectedDates[0], selectedDates[1]);
                }
            });
        }

        // 🔥 Reset o seteo dinámico
        if (dateInit || dateEnd) {
            flatpickrInstance.current.setDate([dateInit, dateEnd], false);
        } else {
            flatpickrInstance.current.clear(); // 👈 reinicia el input
        }

        return () => {
            // Evita múltiples instancias
            flatpickrInstance.current?.destroy();
            flatpickrInstance.current = null;
        };

    }, [dateInit, dateEnd]);

    return (
        <div className="form-floating form-floating-outline">
            <input
                type="text"
                placeholder={placeholder}
                onChange={(e) => {
                    const value = e.target.value;
                    const dates = value.split(' - ');
                    onChangeRef.current?.(dates[0], dates[1]);
                }}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                required={required}
                ref={dateRangeRef}
            />
            <label htmlFor={id}>{label}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    )
}

export default InputDateRange;