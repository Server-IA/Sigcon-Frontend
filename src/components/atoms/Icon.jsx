const Icon = ({ name, className}) => {
    return (
        <i className={`${name ? name : 'ri-circle-fill'} ${className}`} />
    );
};

export default Icon;