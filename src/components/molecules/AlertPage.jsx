import PropTypes from 'prop-types';

const AlertPage = ({ type, message, show }) => {
    if (!show) return null;

    return (
        <div className={`alert alert-${type} alert-dismissible`} role="alert">
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <span>{message}</span>
        </div>
    )
}

AlertPage.propTypes = {
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    show: PropTypes.bool.isRequired,
}

export default AlertPage;