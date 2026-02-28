import { useEffect, useRef } from "react";

const InputDateRange = ({ id, label, dateInit, dateEnd, onChange, error, placeholder, required}) => {

    const dateRangeRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const $dateRange = $(dateRangeRef.current);
    }, []);

    useEffect(() => {
        const $dateRange = $(dateRangeRef.current);
        $dateRange.flatpickr({
            mode: 'range',
            dateFormat: 'Y-m-d',
            placeholder: placeholder,
            required: required,
            defaultDate: [dateInit, dateEnd],
            onChange: (selectedDates, dateStr, instance) => {
                onChangeRef.current?.(selectedDates[0], selectedDates[1]);
            }
        });
    }, []);

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