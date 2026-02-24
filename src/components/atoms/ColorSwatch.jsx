import React, { useRef } from 'react';

const ColorSwatch = ({ color, onChange }) => {
    const inputRef = useRef(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e) => {
        onChange?.(e.target.value);
    };

    return (
        <div className="color-swatch-wrapper">
            <div
                className="color-swatch"
                style={{ backgroundColor: color }}
                onClick={handleClick}
                title="Haz clic para cambiar el color"
            />
            <input
                ref={inputRef}
                type="color"
                value={color || '#000000'}
                onChange={handleChange}
                style={{
                    opacity: 0,
                    position: 'absolute',
                    pointerEvents: 'none',
                    width: 0,
                    height: 0
                }}
            />
        </div>
    );
};

export default ColorSwatch;
