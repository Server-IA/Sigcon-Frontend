import { useEffect, useRef } from 'react';

const MultiSelectModal = ({ id, label, value = [], onChange, error, placeholder, options = [] }) => {
    const selectRef = useRef(null);

    useEffect(() => {
        if (!selectRef.current) return;

        const $select = $(selectRef.current);
        
        $select.select2({
            placeholder: placeholder || 'Seleccione una opción',
            allowClear: true,
            width: '100%',
            dropdownParent: $select.closest('.modal-body').length 
                ? $select.closest('.modal-body') 
                : $(document.body)
        });

        $select.on('change', function() {
            const selectedValues = $(this).val() || [];
            onChange(selectedValues);
        });

        return () => {
            if ($select.data('select2')) {
                $select.select2('destroy');
            }
        };
    }, []);

    useEffect(() => {
        if (selectRef.current) {
            const $select = $(selectRef.current);
            $select.val(value).trigger('change.select2');
        }
    }, [value, options]);

    return (
        <div className="form-floating form-floating-outline">
            <select
                ref={selectRef}
                id={id}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                multiple
            >
                {options.map(option => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            <label htmlFor={id}>{label}</label>
            {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
    );
};

export default MultiSelectModal;